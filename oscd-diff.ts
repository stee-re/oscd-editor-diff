import { LitElement, html, css } from 'lit';
import { property, query } from 'lit/decorators.js';
import { newHasher } from './hash.js';

import './diff-tree.js';

export default class OscdDiff extends LitElement {
  @query('#doc1') doc1?: HTMLSelectElement;

  @query('#doc2') doc2?: HTMLSelectElement;

  @query('#tag') tag?: HTMLSelectElement;

  @property() docName = '';

  @property() doc?: XMLDocument;

  @property() docs: Record<string, XMLDocument> = {};

  get docName1(): string {
    return this.doc1?.value || '';
  }

  get docName2(): string {
    return this.doc2?.value || '';
  }

  get tagName(): string {
    return this.tag?.value || '';
  }

  hashers = new WeakMap<XMLDocument, ReturnType<typeof newHasher>>();

  render() {
    return html`<div
        style="display: grid; gap: 8px; grid-template-columns: min-content min-content; margin-bottom: 1em;"
      >
        <md-filled-select required id="doc1" label="Document 1">
          ${Object.keys(this.docs).map(
            name =>
              html`<md-select-option value="${name}"
                >${name}</md-select-option
              >`,
          )}
        </md-filled-select>
        <md-filled-select
          required
          id="doc2"
          label="Document 2"
          style="--md-sys-color-primary: var(--oscd-secondary)"
        >
          ${Object.keys(this.docs).map(
            name =>
              html`<md-select-option value="${name}"
                >${name}</md-select-option
              >`,
          )}
        </md-filled-select>
        <md-filled-button
          @click=${() => {
            const doc1 = this.docs[this.docName1];
            const doc2 = this.docs[this.docName2];
            if (!doc1 || !doc2) return;
            if (!this.hashers.has(doc1)) this.hashers.set(doc1, newHasher());
            if (!this.hashers.has(doc2)) this.hashers.set(doc2, newHasher());
            this.requestUpdate();
            const h1 = this.hashers.get(doc1)!;
            const h2 = this.hashers.get(doc2)!;
            /* eslint-disable no-console */
            console.time(`hash1${this.docName1}`);
            const hash1 = h1.hash(doc1.documentElement);
            console.timeEnd(`hash1${this.docName1}`);
            console.time(`hash2${this.docName2}`);
            const hash2 = h2.hash(doc2.documentElement);
            console.timeEnd(`hash2${this.docName2}`);
            console.log(hash1, hash2);
            /* eslint-enable no-console */
          }}
          }
        >
          diff
        </md-filled-button>
      </div>
      <diff-tree
        .ours=${this.docs[this.docName1]?.documentElement}
        .theirs=${this.docs[this.docName2]?.documentElement}
        .hashers=${this.hashers}
      ></diff-tree> `;
  }

  static styles = css`
    * {
      cursor: default;
    }
    :host {
      font-family: var(--oscd-text-font);
      display: block;
      padding: 0.5rem;
      --oscd-text-font: var(--oscd-theme-text-font, 'Roboto');
      --md-sys-color-primary: var(--oscd-primary);
      --md-sys-color-secondary: var(--oscd-secondary);
      --md-sys-color-secondary-container: var(--oscd-base2);
      --md-sys-color-on-primary: var(--oscd-base3);
      --md-sys-color-on-secondary: var(--oscd-base3);
      --md-sys-color-on-surface: var(--oscd-base00);
      --md-sys-color-on-surface-variant: var(--oscd-base01);
      --md-sys-color-surface: var(--oscd-base2);
      --md-sys-color-surface-container: var(--oscd-base3);
      --md-sys-color-surface-container-highest: var(--oscd-base3);
    }
  `;
}
