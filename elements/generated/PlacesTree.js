class FirefoxPlacesTree extends FirefoxTree {
  constructor() {
    super();
  }
  connectedCallback() {
    super.connectedCallback();
    console.log(this, "connected");

    let comment = document.createComment("Creating firefox-places-tree");
    this.prepend(comment);

    Object.defineProperty(this, "_contextMenuShown", {
      configurable: true,
      enumerable: true,
      get() {
        delete this._contextMenuShown;
        return (this._contextMenuShown = false);
      }
    });
    Object.defineProperty(this, "_active", {
      configurable: true,
      enumerable: true,
      get() {
        delete this._active;
        return (this._active = true);
      }
    });

    try {
      // Force an initial build.
      if (this.place) this.place = this.place;
    } catch (e) {}
  }
  disconnectedCallback() {}

  get controller() {
    return this._controller;
  }

  set view(val) {
    return (this.treeBoxObject.view = val);
  }

  get view() {
    try {
      return this.treeBoxObject.view.wrappedJSObject || null;
    } catch (e) {
      return null;
    }
  }

  get associatedElement() {
    return this;
  }

  set flatList(val) {
    if (this.flatList != val) {
      this.setAttribute("flatList", val);
      // reload with the last place set
      if (this.place) this.place = this.place;
    }
    return val;
  }

  get flatList() {
    return this.getAttribute("flatList") == "true";
  }

  set onOpenFlatContainer(val) {
    if (this.onOpenFlatContainer != val) {
      this.setAttribute("onopenflatcontainer", val);
      // reload with the last place set
      if (this.place) this.place = this.place;
    }
    return val;
  }

  get onOpenFlatContainer() {
    return this.getAttribute("onopenflatcontainer");
  }

  get result() {
    try {
      return this.view.QueryInterface(Ci.nsINavHistoryResultObserver).result;
    } catch (e) {
      return null;
    }
  }

  set place(val) {
    this.setAttribute("place", val);

    var queriesRef = {};
    var queryCountRef = {};
    var optionsRef = {};
    PlacesUtils.history.queryStringToQueries(
      val,
      queriesRef,
      queryCountRef,
      optionsRef
    );
    if (queryCountRef.value == 0)
      queriesRef.value = [PlacesUtils.history.getNewQuery()];
    if (!optionsRef.value)
      optionsRef.value = PlacesUtils.history.getNewQueryOptions();

    this.load(queriesRef.value, optionsRef.value);

    return val;
  }

  get place() {
    return this.getAttribute("place");
  }

  get hasSelection() {
    return this.view && this.view.selection.count >= 1;
  }

  get selectedNodes() {
    let nodes = [];
    if (!this.hasSelection) return nodes;

    let selection = this.view.selection;
    let rc = selection.getRangeCount();
    let resultview = this.view;
    for (let i = 0; i < rc; ++i) {
      let min = {},
        max = {};
      selection.getRangeAt(i, min, max);
      for (let j = min.value; j <= max.value; ++j) {
        nodes.push(resultview.nodeForTreeIndex(j));
      }
    }
    return nodes;
  }

  get removableSelectionRanges() {
    // This property exists in addition to selectedNodes because it
    // encodes selection ranges (which only occur in list views) into
    // the return value. For each removed range, the index at which items
    // will be re-inserted upon the remove transaction being performed is
    // the first index of the range, so that the view updates correctly.
    //
    // For example, if we remove rows 2,3,4 and 7,8 from a list, when we
    // undo that operation, if we insert what was at row 3 at row 3 again,
    // it will show up _after_ the item that was at row 5. So we need to
    // insert all items at row 2, and the tree view will update correctly.
    //
    // Also, this function collapses the selection to remove redundant
    // data, e.g. when deleting this selection:
    //
    //      http://www.foo.com/
    //  (-) Some Folder
    //        http://www.bar.com/
    //
    // ... returning http://www.bar.com/ as part of the selection is
    // redundant because it is implied by removing "Some Folder". We
    // filter out all such redundancies since some partial amount of
    // the folder's children may be selected.
    //
    let nodes = [];
    if (!this.hasSelection) return nodes;

    var selection = this.view.selection;
    var rc = selection.getRangeCount();
    var resultview = this.view;
    // This list is kept independently of the range selected (i.e. OUTSIDE
    // the for loop) since the row index of a container is unique for the
    // entire view, and we could have some really wacky selection and we
    // don't want to blow up.
    var containers = {};
    for (var i = 0; i < rc; ++i) {
      var range = [];
      var min = {},
        max = {};
      selection.getRangeAt(i, min, max);

      for (var j = min.value; j <= max.value; ++j) {
        if (this.view.isContainer(j)) containers[j] = true;
        if (!(this.view.getParentIndex(j) in containers))
          range.push(resultview.nodeForTreeIndex(j));
      }
      nodes.push(range);
    }
    return nodes;
  }

  get draggableSelection() {
    return this.selectedNodes;
  }

  get selectedNode() {
    var view = this.view;
    if (!view || view.selection.count != 1) return null;

    var selection = view.selection;
    var min = {},
      max = {};
    selection.getRangeAt(0, min, max);

    return this.view.nodeForTreeIndex(min.value);
  }

  get insertionPoint() {
    // invalidated on selection and focus changes
    if (this._cachedInsertionPoint !== undefined)
      return this._cachedInsertionPoint;

    // there is no insertion point for history queries
    // so bail out now and save a lot of work when updating commands
    var resultNode = this.result.root;
    if (
      PlacesUtils.nodeIsQuery(resultNode) &&
      PlacesUtils.asQuery(resultNode).queryOptions.queryType ==
        Ci.nsINavHistoryQueryOptions.QUERY_TYPE_HISTORY
    )
      return (this._cachedInsertionPoint = null);

    var orientation = Ci.nsITreeView.DROP_BEFORE;
    // If there is no selection, insert at the end of the container.
    if (!this.hasSelection) {
      var index = this.view.rowCount - 1;
      this._cachedInsertionPoint = this._getInsertionPoint(index, orientation);
      return this._cachedInsertionPoint;
    }

    // This is a two-part process. The first part is determining the drop
    // orientation.
    // * The default orientation is to drop _before_ the selected item.
    // * If the selected item is a container, the default orientation
    //   is to drop _into_ that container.
    //
    // Warning: It may be tempting to use tree indexes in this code, but
    //          you must not, since the tree is nested and as your tree
    //          index may change when folders before you are opened and
    //          closed. You must convert your tree index to a node, and
    //          then use getChildIndex to find your absolute index in
    //          the parent container instead.
    //
    var resultView = this.view;
    var selection = resultView.selection;
    var rc = selection.getRangeCount();
    var min = {},
      max = {};
    selection.getRangeAt(rc - 1, min, max);

    // If the sole selection is a container, and we are not in
    // a flatlist, insert into it.
    // Note that this only applies to _single_ selections,
    // if the last element within a multi-selection is a
    // container, insert _adjacent_ to the selection.
    //
    // If the sole selection is the bookmarks toolbar folder, we insert
    // into it even if it is not opened
    if (
      selection.count == 1 &&
      resultView.isContainer(max.value) &&
      !this.flatList
    )
      orientation = Ci.nsITreeView.DROP_ON;

    this._cachedInsertionPoint = this._getInsertionPoint(
      max.value,
      orientation
    );
    return this._cachedInsertionPoint;
  }

  get ownerWindow() {
    return window;
  }

  set active(val) {
    return (this._active = val);
  }

  get active() {
    return this._active;
  }
  applyFilter(filterString, folderRestrict, includeHidden) {
    // preserve grouping
    var queryNode = PlacesUtils.asQuery(this.result.root);
    var options = queryNode.queryOptions.clone();

    // Make sure we're getting uri results.
    // We do not yet support searching into grouped queries or into
    // tag containers, so we must fall to the default case.
    if (
      PlacesUtils.nodeIsHistoryContainer(queryNode) ||
      options.resultType == options.RESULTS_AS_TAG_QUERY ||
      options.resultType == options.RESULTS_AS_TAG_CONTENTS
    )
      options.resultType = options.RESULTS_AS_URI;

    var query = PlacesUtils.history.getNewQuery();
    query.searchTerms = filterString;

    if (folderRestrict) {
      query.setFolders(folderRestrict, folderRestrict.length);
      options.queryType = options.QUERY_TYPE_BOOKMARKS;
    }

    options.includeHidden = !!includeHidden;

    this.load([query], options);
  }
  load(queries, options) {
    let result = PlacesUtils.history.executeQueries(
      queries,
      queries.length,
      options
    );
    let callback;
    if (this.flatList) {
      let onOpenFlatContainer = this.onOpenFlatContainer;
      if (onOpenFlatContainer)
        callback = new Function("aContainer", onOpenFlatContainer);
    }

    if (!this._controller) {
      this._controller = new PlacesController(this);
      this.controllers.appendController(this._controller);
    }

    let treeView = new PlacesTreeView(
      this.flatList,
      callback,
      this._controller
    );

    // Observer removal is done within the view itself.  When the tree
    // goes away, treeboxobject calls view.setTree(null), which then
    // calls removeObserver.
    result.addObserver(treeView);
    this.view = treeView;

    if (
      this.getAttribute("selectfirstnode") == "true" &&
      treeView.rowCount > 0
    ) {
      treeView.selection.select(0);
    }

    this._cachedInsertionPoint = undefined;
  }
  selectPlaceURI(placeURI) {
    // Do nothing if a node matching the given uri is already selected
    if (this.hasSelection && this.selectedNode.uri == placeURI) return;

    function findNode(container, nodesURIChecked) {
      var containerURI = container.uri;
      if (containerURI == placeURI) return container;
      if (nodesURIChecked.includes(containerURI)) return null;

      // never check the contents of the same query
      nodesURIChecked.push(containerURI);

      var wasOpen = container.containerOpen;
      if (!wasOpen) container.containerOpen = true;
      for (var i = 0; i < container.childCount; ++i) {
        var child = container.getChild(i);
        var childURI = child.uri;
        if (childURI == placeURI) return child;
        else if (PlacesUtils.nodeIsContainer(child)) {
          var nested = findNode(
            PlacesUtils.asContainer(child),
            nodesURIChecked
          );
          if (nested) return nested;
        }
      }

      if (!wasOpen) container.containerOpen = false;

      return null;
    }

    var container = this.result.root;
    NS_ASSERT(container, "No result, cannot select place URI!");
    if (!container) return;

    var child = findNode(container, []);
    if (child) this.selectNode(child);
    else {
      // If the specified child could not be located, clear the selection
      var selection = this.view.selection;
      selection.clearSelection();
    }
  }
  selectNode(node) {
    var view = this.view;

    var parent = node.parent;
    if (parent && !parent.containerOpen) {
      // Build a list of all of the nodes that are the parent of this one
      // in the result.
      var parents = [];
      var root = this.result.root;
      while (parent && parent != root) {
        parents.push(parent);
        parent = parent.parent;
      }

      // Walk the list backwards (opening from the root of the hierarchy)
      // opening each folder as we go.
      for (var i = parents.length - 1; i >= 0; --i) {
        let index = view.treeIndexForNode(parents[i]);
        if (
          index != Ci.nsINavHistoryResultTreeViewer.INDEX_INVISIBLE &&
          view.isContainer(index) &&
          !view.isContainerOpen(index)
        )
          view.toggleOpenState(index);
      }
      // Select the specified node...
    }

    let index = view.treeIndexForNode(node);
    if (index == Ci.nsINavHistoryResultTreeViewer.INDEX_INVISIBLE) return;

    view.selection.select(index);
    // ... and ensure it's visible, not scrolled off somewhere.
    this.treeBoxObject.ensureRowIsVisible(index);
  }
  toggleCutNode(aNode, aValue) {
    this.view.toggleCutNode(aNode, aValue);
  }
  _getInsertionPoint(index, orientation) {
    var result = this.result;
    var resultview = this.view;
    var container = result.root;
    var dropNearNode = null;
    NS_ASSERT(container, "null container");
    // When there's no selection, assume the container is the container
    // the view is populated from (i.e. the result's itemId).
    if (index != -1) {
      var lastSelected = resultview.nodeForTreeIndex(index);
      if (
        resultview.isContainer(index) &&
        orientation == Ci.nsITreeView.DROP_ON
      ) {
        // If the last selected item is an open container, append _into_
        // it, rather than insert adjacent to it.
        container = lastSelected;
        index = -1;
      } else if (
        lastSelected.containerOpen &&
        orientation == Ci.nsITreeView.DROP_AFTER &&
        lastSelected.hasChildren
      ) {
        // If the last selected item is an open container and the user is
        // trying to drag into it as a first item, really insert into it.
        container = lastSelected;
        orientation = Ci.nsITreeView.DROP_ON;
        index = 0;
      } else {
        // Use the last-selected node's container.
        container = lastSelected.parent;

        // See comment in the treeView.js's copy of this method
        if (!container || !container.containerOpen) return null;

        // Avoid the potentially expensive call to getChildIndex
        // if we know this container doesn't allow insertion
        if (PlacesControllerDragHelper.disallowInsertion(container))
          return null;

        var queryOptions = PlacesUtils.asQuery(result.root).queryOptions;
        if (
          queryOptions.sortingMode != Ci.nsINavHistoryQueryOptions.SORT_BY_NONE
        ) {
          // If we are within a sorted view, insert at the end
          index = -1;
        } else if (
          queryOptions.excludeItems ||
          queryOptions.excludeQueries ||
          queryOptions.excludeReadOnlyFolders
        ) {
          // Some item may be invisible, insert near last selected one.
          // We don't replace index here to avoid requests to the db,
          // instead it will be calculated later by the controller.
          index = -1;
          dropNearNode = lastSelected;
        } else {
          var lsi = container.getChildIndex(lastSelected);
          index = orientation == Ci.nsITreeView.DROP_BEFORE ? lsi : lsi + 1;
        }
      }
    }

    if (PlacesControllerDragHelper.disallowInsertion(container)) return null;

    // TODO (Bug 1160193): properly support dropping on a tag root.
    let tagName = null;
    if (PlacesUtils.nodeIsTagQuery(container)) {
      tagName = container.title;
      if (!tagName) return null;
    }

    return new InsertionPoint({
      parentId: PlacesUtils.getConcreteItemId(container),
      parentGuid: PlacesUtils.getConcreteItemGuid(container),
      index,
      orientation,
      tagName,
      dropNearNode
    });
  }
  selectAll() {
    this.view.selection.selectAll();
  }
  selectItems(aIDs, aOpenContainers) {
    // Never open containers in flat lists.
    if (this.flatList) aOpenContainers = false;
    // By default, we do search and select within containers which were
    // closed (note that containers in which nodes were not found are
    // closed).
    if (aOpenContainers === undefined) aOpenContainers = true;

    var ids = aIDs; // don't manipulate the caller's array

    // Array of nodes found by findNodes which are to be selected
    var nodes = [];

    // Array of nodes found by findNodes which should be opened
    var nodesToOpen = [];

    // A set of GUIDs of container-nodes that were previously searched,
    // and thus shouldn't be searched again. This is empty at the initial
    // start of the recursion and gets filled in as the recursion
    // progresses.
    var checkedGuidsSet = new Set();

    /**
           * Recursively search through a node's children for items
           * with the given IDs. When a matching item is found, remove its ID
           * from the IDs array, and add the found node to the nodes dictionary.
           *
           * NOTE: This method will leave open any node that had matching items
           * in its subtree.
           */
    function findNodes(node) {
      var foundOne = false;
      // See if node matches an ID we wanted; add to results.
      // For simple folder queries, check both itemId and the concrete
      // item id.
      var index = ids.indexOf(node.itemId);
      if (
        index == -1 &&
        node.type == Ci.nsINavHistoryResultNode.RESULT_TYPE_FOLDER_SHORTCUT
      )
        index = ids.indexOf(PlacesUtils.asQuery(node).folderItemId);

      if (index != -1) {
        nodes.push(node);
        foundOne = true;
        ids.splice(index, 1);
      }

      var concreteGuid = PlacesUtils.getConcreteItemGuid(node);
      if (
        ids.length == 0 ||
        !PlacesUtils.nodeIsContainer(node) ||
        checkedGuidsSet.has(concreteGuid)
      )
        return foundOne;

      // Only follow a query if it has been been explicitly opened by the caller.
      let shouldOpen = aOpenContainers && PlacesUtils.nodeIsFolder(node);
      PlacesUtils.asContainer(node);
      if (!node.containerOpen && !shouldOpen) return foundOne;

      checkedGuidsSet.add(concreteGuid);

      // Remember the beginning state so that we can re-close
      // this node if we don't find any additional results here.
      var previousOpenness = node.containerOpen;
      node.containerOpen = true;
      for (var child = 0; child < node.childCount && ids.length > 0; child++) {
        var childNode = node.getChild(child);
        var found = findNodes(childNode);
        if (!foundOne) foundOne = found;
      }

      // If we didn't find any additional matches in this node's
      // subtree, revert the node to its previous openness.
      if (foundOne) nodesToOpen.unshift(node);
      node.containerOpen = previousOpenness;
      return foundOne;
    }

    // Disable notifications while looking for nodes.
    let result = this.result;
    let didSuppressNotifications = result.suppressNotifications;
    if (!didSuppressNotifications) result.suppressNotifications = true;
    try {
      findNodes(this.result.root);
    } finally {
      if (!didSuppressNotifications) result.suppressNotifications = false;
    }

    // For all the nodes we've found, highlight the corresponding
    // index in the tree.
    var resultview = this.view;
    var selection = this.view.selection;
    selection.selectEventsSuppressed = true;
    selection.clearSelection();
    // Open nodes containing found items
    for (let i = 0; i < nodesToOpen.length; i++) {
      nodesToOpen[i].containerOpen = true;
    }
    for (let i = 0; i < nodes.length; i++) {
      var index = resultview.treeIndexForNode(nodes[i]);
      if (index == Ci.nsINavHistoryResultTreeViewer.INDEX_INVISIBLE) continue;
      selection.rangedSelect(index, index, true);
    }
    selection.selectEventsSuppressed = false;
  }
  buildContextMenu(aPopup) {
    this._contextMenuShown = true;
    return this.controller.buildContextMenu(aPopup);
  }
  destroyContextMenu(aPopup) {}
}
customElements.define("firefox-places-tree", FirefoxPlacesTree);