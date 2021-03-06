/* This Source Code Form is subject to the terms of the Mozilla Public
  * License, v. 2.0. If a copy of the MPL was not distributed with this
  * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// This is loaded into all XUL windows. Wrap in a block to prevent
// leaking to window scope.
{

class MozDownloadSubviewToolbarbutton extends MozButtonBase {
  connectedCallback() {
    if (this.delayConnectedCallback()) {
      return;
    }
    this.textContent = "";
    this.appendChild(MozXULElement.parseXULToFragment(`
      <image class="toolbarbutton-icon" validate="always" inherits="src=image"></image>
      <vbox class="toolbarbutton-text" flex="1">
        <label crop="end" inherits="value=label"></label>
        <label class="status-text status-full" crop="end" inherits="value=status"></label>
        <label class="status-text status-open" crop="end" inherits="value=openLabel"></label>
        <label class="status-text status-retry" crop="end" inherits="value=retryLabel"></label>
        <label class="status-text status-show" crop="end" inherits="value=showLabel"></label>
      </vbox>
      <toolbarbutton anonid="button" class="action-button"></toolbarbutton>
    `));
    // XXX: Implement `this.inheritAttribute()` for the [inherits] attribute in the markup above!

  }
}

customElements.define("download-subview-toolbarbutton", MozDownloadSubviewToolbarbutton);

}
