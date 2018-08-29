class MozTextLink extends MozTextLabel {
  connectedCallback() {
    super.connectedCallback()

    this._setupEventListeners();
  }

  set href(val) {
    this.setAttribute('href', val);
    return val;
  }

  get href() {
    return this.getAttribute('href');
  }

  open(aEvent) {
    var href = this.href;
    if (!href || this.disabled || aEvent.defaultPrevented)
      return;

    var uri = null;
    try {
      const nsISSM = Ci.nsIScriptSecurityManager;
      const secMan =
        Cc["@mozilla.org/scriptsecuritymanager;1"]
        .getService(nsISSM);

      const ioService =
        Cc["@mozilla.org/network/io-service;1"]
        .getService(Ci.nsIIOService);

      uri = ioService.newURI(href);

      let principal;
      if (this.getAttribute("useoriginprincipal") == "true") {
        principal = this.nodePrincipal;
      } else {
        principal = secMan.createNullPrincipal({});
      }
      try {
        secMan.checkLoadURIWithPrincipal(principal, uri,
          nsISSM.DISALLOW_INHERIT_PRINCIPAL);
      } catch (ex) {
        var msg = "Error: Cannot open a " + uri.scheme + ": link using \
                         the text-link binding.";
        Cu.reportError(msg);
        return;
      }

      const cID = "@mozilla.org/uriloader/external-protocol-service;1";
      const nsIEPS = Ci.nsIExternalProtocolService;
      var protocolSvc = Cc[cID].getService(nsIEPS);

      // if the scheme is not an exposed protocol, then opening this link
      // should be deferred to the system's external protocol handler
      if (!protocolSvc.isExposedProtocol(uri.scheme)) {
        protocolSvc.loadURI(uri);
        aEvent.preventDefault();
        return;
      }

    } catch (ex) {
      Cu.reportError(ex);
    }

    aEvent.preventDefault();
    href = uri ? uri.spec : href;

    // Try handing off the link to the host application, e.g. for
    // opening it in a tabbed browser.
    var linkHandled = Cc["@mozilla.org/supports-PRBool;1"]
      .createInstance(Ci.nsISupportsPRBool);
    linkHandled.data = false;
    let { shiftKey, ctrlKey, metaKey, altKey, button } = aEvent;
    let data = { shiftKey, ctrlKey, metaKey, altKey, button, href };
    Cc["@mozilla.org/observer-service;1"]
      .getService(Ci.nsIObserverService)
      .notifyObservers(linkHandled, "handle-xul-text-link", JSON.stringify(data));
    if (linkHandled.data)
      return;

    // otherwise, fall back to opening the anchor directly
    var win = window;
    if (window.isChromeWindow) {
      while (win.opener && !win.opener.closed)
        win = win.opener;
    }
    win.open(href);
  }

  _setupEventListeners() {
    this.addEventListener("click", (event) => { this.open(event) }, true);

    this.addEventListener("click", (event) => { this.open(event) }, true);

    this.addEventListener("keypress", (event) => { if (event.keyCode != KeyEvent.DOM_VK_RETURN) { return; } this.click() });

  }
}