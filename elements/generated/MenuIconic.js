class FirefoxMenuIconic extends FirefoxMenuBase {
  constructor() {
    super();
  }
  connectedCallback() {
    super.connectedCallback();
    console.log(this, "connected");

    this.innerHTML = `<xul:hbox class="menu-iconic-left" align="center" pack="center">
<xul:image class="menu-iconic-icon" inherits="src=image">
</xul:image>
</xul:hbox>
<xul:label class="menu-iconic-text" flex="1" inherits="value=label,accesskey,crop,highlightable" crop="right">
</xul:label>
<xul:label class="menu-iconic-highlightable-text" inherits="text=label,crop,accesskey,highlightable" crop="right">
</xul:label>
<xul:hbox class="menu-accel-container" anonid="accel">
<xul:label class="menu-iconic-accel" inherits="value=acceltext">
</xul:label>
</xul:hbox>
<xul:hbox align="center" class="menu-right" inherits="_moz-menuactive,disabled">
<xul:image>
</xul:image>
</xul:hbox>
<children includes="menupopup|template">
</children>`;
    let comment = document.createComment("Creating firefox-menu-iconic");
    this.prepend(comment);
  }
  disconnectedCallback() {}
}
customElements.define("firefox-menu-iconic", FirefoxMenuIconic);
