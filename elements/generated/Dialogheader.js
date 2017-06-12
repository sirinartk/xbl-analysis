class XblDialogheader extends BaseElement {
  constructor() {
    super();
  }
  connectedCallback() {
    console.log(this, "connected");

    this.innerHTML = `<label class="dialogheader-title" xbl:inherits="value=title,crop" crop="right" flex="1">
</label>
<label class="dialogheader-description" xbl:inherits="value=description">
</label>`;
    let comment = document.createComment("Creating xbl-dialogheader");
    this.prepend(comment);
  }
  disconnectedCallback() {}
}
customElements.define("xbl-dialogheader", XblDialogheader);