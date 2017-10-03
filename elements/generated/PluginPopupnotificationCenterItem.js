class FirefoxPluginPopupnotificationCenterItem extends BaseElement {
  constructor() {
    super();
  }
  connectedCallback() {
    console.log(this, "connected");

    this.innerHTML = `<vbox pack="center" anonid="itemBox" class="itemBox">
<description anonid="center-item-label" class="center-item-label">
</description>
<hbox flex="1" pack="start" align="center" anonid="center-item-warning">
<image anonid="center-item-warning-icon" class="center-item-warning-icon">
</image>
<firefox-text-label anonid="center-item-warning-label">
</firefox-text-label>
<firefox-text-label anonid="center-item-link" value="&checkForUpdates;" class="text-link">
</firefox-text-label>
</hbox>
</vbox>
<vbox pack="center">
<menulist class="center-item-menulist" anonid="center-item-menulist">
<menupopup>
<menuitem anonid="allownow" value="allownow" label="&pluginActivateNow.label;">
</menuitem>
<menuitem anonid="allowalways" value="allowalways" label="&pluginActivateAlways.label;">
</menuitem>
<menuitem anonid="block" value="block" label="&pluginBlockNow.label;">
</menuitem>
</menupopup>
</menulist>
</vbox>`;
    let comment = document.createComment(
      "Creating firefox-plugin-popupnotification-center-item"
    );
    this.prepend(comment);

    document.getAnonymousElementByAttribute(
      this,
      "anonid",
      "center-item-label"
    ).value = this.action.pluginName;

    let curState = "block";
    if (this.action.fallbackType == Ci.nsIObjectLoadingContent.PLUGIN_ACTIVE) {
      if (
        this.action.pluginPermissionType ==
        Ci.nsIPermissionManager.EXPIRE_SESSION
      ) {
        curState = "allownow";
      } else {
        curState = "allowalways";
      }
    }
    document.getAnonymousElementByAttribute(
      this,
      "anonid",
      "center-item-menulist"
    ).value = curState;

    let warningString = "";
    let linkString = "";

    let link = document.getAnonymousElementByAttribute(
      this,
      "anonid",
      "center-item-link"
    );

    let url;
    let linkHandler;

    if (this.action.pluginTag.enabledState == Ci.nsIPluginTag.STATE_DISABLED) {
      document.getAnonymousElementByAttribute(
        this,
        "anonid",
        "center-item-menulist"
      ).hidden = true;
      warningString = gNavigatorBundle.getString(
        "pluginActivateDisabled.label"
      );
      linkString = gNavigatorBundle.getString("pluginActivateDisabled.manage");
      linkHandler = function(event) {
        event.preventDefault();
        gPluginHandler.managePlugins();
      };
      document.getAnonymousElementByAttribute(
        this,
        "anonid",
        "center-item-warning-icon"
      ).hidden = true;
    } else {
      url = this.action.detailsLink;

      switch (this.action.blocklistState) {
        case Ci.nsIBlocklistService.STATE_NOT_BLOCKED:
          document.getAnonymousElementByAttribute(
            this,
            "anonid",
            "center-item-warning"
          ).hidden = true;
          break;
        case Ci.nsIBlocklistService.STATE_BLOCKED:
          document.getAnonymousElementByAttribute(
            this,
            "anonid",
            "center-item-menulist"
          ).hidden = true;
          warningString = gNavigatorBundle.getString(
            "pluginActivateBlocked.label"
          );
          linkString = gNavigatorBundle.getString("pluginActivate.learnMore");
          break;
        case Ci.nsIBlocklistService.STATE_VULNERABLE_UPDATE_AVAILABLE:
          warningString = gNavigatorBundle.getString(
            "pluginActivateOutdated.label"
          );
          linkString = gNavigatorBundle.getString("pluginActivate.updateLabel");
          break;
        case Ci.nsIBlocklistService.STATE_VULNERABLE_NO_UPDATE:
          warningString = gNavigatorBundle.getString(
            "pluginActivateVulnerable.label"
          );
          linkString = gNavigatorBundle.getString("pluginActivate.riskLabel");
          break;
      }
    }
    document.getAnonymousElementByAttribute(
      this,
      "anonid",
      "center-item-warning-label"
    ).value = warningString;

    let chromeWin = window.QueryInterface(Ci.nsIDOMChromeWindow);
    let isWindowPrivate = PrivateBrowsingUtils.isWindowPrivate(chromeWin);

    if (isWindowPrivate) {
      // TODO: temporary compromise of hiding some privacy leaks, remove once bug 892487 is fixed
      let allowalways = document.getAnonymousElementByAttribute(
        this,
        "anonid",
        "allowalways"
      );
      let block = document.getAnonymousElementByAttribute(
        this,
        "anonid",
        "block"
      );
      let allownow = document.getAnonymousElementByAttribute(
        this,
        "anonid",
        "allownow"
      );

      allowalways.hidden = curState !== "allowalways";
      block.hidden = curState !== "block";
      allownow.hidden = curState === "allowalways";
    }

    if (url || linkHandler) {
      link.value = linkString;
      if (url) {
        link.href = url;
      }
      if (linkHandler) {
        link.addEventListener("click", linkHandler);
      }
    } else {
      link.hidden = true;
    }
  }
  disconnectedCallback() {}

  set value(val) {
    document.getAnonymousElementByAttribute(
      this,
      "anonid",
      "center-item-menulist"
    ).value = val;
  }

  get value() {
    return document.getAnonymousElementByAttribute(
      this,
      "anonid",
      "center-item-menulist"
    ).value;
  }
}
customElements.define(
  "firefox-plugin-popupnotification-center-item",
  FirefoxPluginPopupnotificationCenterItem
);