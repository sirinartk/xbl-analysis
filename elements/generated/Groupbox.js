/* This Source Code Form is subject to the terms of the Mozilla Public
  * License, v. 2.0. If a copy of the MPL was not distributed with this
  * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// This is loaded into all XUL windows. Wrap in a block to prevent
// leaking to window scope.
{

class MozGroupbox extends MozXULElement {
  connectedCallback() {

    this.appendChild(MozXULElement.parseXULToFragment(`
      <hbox class="groupbox-title" align="center" pack="start">
        <children includes="caption"></children>
      </hbox>
      <box flex="1" class="groupbox-body" inherits="orient,align,pack">
        <children></children>
      </box>
    `));

    this._setupEventListeners();
  }

  _setupEventListeners() {

  }
}

customElements.define("groupbox", MozGroupbox);

}
