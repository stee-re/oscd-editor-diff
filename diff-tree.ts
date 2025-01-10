import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { identity } from '@openenergytools/scl-lib';

import '@material/web/all.js';

import type { newHasher } from './hash.js';

function filterObject(
  obj: object,
  predicate: (entry: [string, any]) => boolean,
) {
  return Object.fromEntries(Object.entries(obj).filter(predicate));
}

type Description = Record<string, string | string[]> & {
  eNS?: Record<string, Record<string, string>>;
};

function getDiff(ours: Description, theirs: Description) {
  const diff: Record<string, { ours?: any; theirs?: any }> = {};

  const keys = new Set([...Object.keys(ours), ...Object.keys(theirs)]);

  keys.forEach(key => {
    if (ours[key] === theirs[key]) return;
    const val = ours[key] ?? theirs[key];
    if (typeof val !== 'object')
      diff[key] = { ours: ours[key], theirs: theirs[key] };
    else if (Array.isArray(val)) {
      const arrayDiff = { ours: [] as string[], theirs: [] as string[] };
      const vals = new Set([...(ours[key] ?? []), ...(theirs[key] ?? [])]);
      vals.forEach(v => {
        const inOurs = ours[key]?.includes(v);
        const inTheirs = theirs[key]?.includes(v);
        if (inOurs && inTheirs) return;
        arrayDiff[inOurs ? 'ours' : 'theirs'].push(v);
      });
      if (arrayDiff.ours.length || arrayDiff.theirs.length)
        diff[key] = arrayDiff;
    } else if (key === 'eNS') {
      const eNSDiff: Record<
        string,
        Record<string, { ours?: string; theirs?: string }>
      > = {};
      const eNS = new Set([
        ...Object.keys(ours.eNS ?? {}),
        ...Object.keys(theirs.eNS ?? {}),
      ]);
      eNS.forEach(ns => {
        const ks = new Set([
          ...Object.keys(ours.eNS?.[ns] ?? {}),
          ...Object.keys(theirs.eNS?.[ns] ?? {}),
        ]);
        ks.forEach(k => {
          if (ours.eNS?.[ns]?.[k] === theirs.eNS?.[ns]?.[k]) return;
          eNSDiff[ns] ??= {};
          eNSDiff[ns][k] = {
            ours: ours.eNS?.[ns]?.[k],
            theirs: theirs.eNS?.[ns]?.[k],
          };
        });
      });
      if (Object.keys(eNSDiff).length) diff[key] = eNSDiff;
    } else
      diff[key] = {
        ours: 'undiffable data type',
        theirs: 'undiffable data type',
      };
  });

  return diff;
}

@customElement('diff-tree')
export class DiffTree extends LitElement {
  @property() ours?: Element;

  @property() theirs?: Element;

  @property() hashers = new WeakMap<
    XMLDocument,
    ReturnType<typeof newHasher>
  >();

  @property({ type: Number }) depth = 0;

  @property({ type: Boolean, reflect: true })
  get odd(): boolean {
    return this.depth % 2 === 0;
  }

  @query('md-icon-button') expandButton!: HTMLElement;

  @property({ type: Boolean })
  expanded = false;

  get ourHasher(): ReturnType<typeof newHasher> | undefined {
    return this.ours ? this.hashers.get(this.ours.ownerDocument) : undefined;
  }

  get theirHasher(): ReturnType<typeof newHasher> | undefined {
    return this.theirs
      ? this.hashers.get(this.theirs.ownerDocument)
      : undefined;
  }

  get ourHash(): string | undefined {
    return this.ourHasher?.hash(this.ours!);
  }

  get theirHash(): string | undefined {
    return this.theirHasher?.hash(this.theirs!);
  }

  get ourDescription(): Description | undefined {
    return this.ourHasher?.db[this.ours!.tagName][this.ourHash ?? ''] as
      | Description
      | undefined;
  }

  get theirDescription(): Description | undefined {
    return this.theirHasher?.db[this.theirs!.tagName][this.theirHash ?? ''] as
      | Description
      | undefined;
  }

  get diff(): Record<string, { ours?: any; theirs?: any }> {
    return getDiff(this.ourDescription ?? {}, this.theirDescription ?? {});
  }

  renderChildDiffs() {
    if (!this.expanded) return nothing;
    return html`<div>
      ${Object.entries(this.diff).map(([key, { ours, theirs }]) => {
        if (!key.startsWith('@')) return nothing;
        const tag = key.slice(1);
        const elementDiff: Record<
          string,
          { ours?: Element; theirs?: Element }
        > = {};
        ours.forEach((digest: string) => {
          const element = Array.from(
            this.ourHasher?.eDb.h2e.get(digest)?.values() ?? [],
          ).find(e => e.tagName === tag);
          if (!element) return;
          const id = identity(element as Element);
          elementDiff[id] ??= {};
          elementDiff[id].ours = element;
        });
        theirs.forEach((digest: string) => {
          const element = Array.from(
            this.theirHasher?.eDb.h2e.get(digest)?.values() ?? [],
          ).find(e => e.tagName === tag);
          if (!element) return;
          const id = identity(element as Element);
          elementDiff[id] ??= {};
          elementDiff[id].theirs = element;
        });
        const expanded = Object.keys(elementDiff).length === 1;
        return Object.values(elementDiff).map(
          ({ ours: o, theirs: t }) =>
            html`<diff-tree
              .ours=${o}
              .theirs=${t}
              .hashers=${this.hashers}
              .expanded=${expanded}
              .depth=${this.depth + 1}
            ></diff-tree>`,
        );
      })}
    </div>`;
  }

  renderAttributeDiff() {
    const attrDiff = filterObject(
      this.diff,
      ([key]) => !key.startsWith('@') && key !== 'eNS',
    );
    const eNSDiff = this.diff.eNS;
    if (!Object.keys(attrDiff).length && !eNSDiff) return nothing;
    return html`<table>
      ${Object.entries(attrDiff).map(
        ([name, { ours, theirs }]) =>
          html`<tr tabindex="0">
            <th></th>
            <th>${name}</th>
            <td><span>${ours}</span></td>
            <td><span>${theirs}</span></td>
          </tr>`,
      )}
      ${Object.entries(eNSDiff ?? {}).map(([ns, ks]) =>
        (
          Object.entries(ks) as [string, { ours: string; theirs: string }][]
        ).map(
          ([k, { ours, theirs }]) =>
            html`<tr tabindex="0">
              <th>${ns}</th>
              <th>${k}</th>
              <td><span>${ours}</span></td>
              <td>
                <span>${theirs}</span>
              </td>
            </tr>`,
        ),
      )}
    </table>`;
  }

  renderDiff() {
    return html`${this.renderAttributeDiff()}${this.renderChildDiffs()}`;
  }

  render() {
    if (this.ourHash === this.theirHash) return nothing;

    const element = this.ours ?? this.theirs;
    if (!element) return nothing;
    const id = (<string>(identity(element) || element.tagName))
      .split('>')
      .pop();
    const zIndex = 10000 - this.depth;
    let style = `top: ${this.depth * 24}px; z-index: ${zIndex};`;
    if (!this.ours) style += 'color: var(--oscd-primary);';
    if (!this.theirs) style += 'color: var(--oscd-error);';
    let desc = element.getAttribute('desc') || '';
    if (desc) desc = `: ${desc}`;
    if (id !== element.tagName) desc = `${element.tagName}${desc}`;

    return html`<button
        style="${style}"
        @click=${() => {
          this.expanded = !this.expanded;
        }}
      >
        <md-icon>${this.expanded ? 'arrow_drop_down' : 'arrow_right'}</md-icon>
        ${id} <small>${desc}</small>
      </button>
      ${this.expanded ? this.renderDiff() : ''}
      <style>
        :host {
          z-index: ${zIndex};
        }
      </style>`;
  }

  static styles = css`
    small {
      font-size: 0.8em;
      font-weight: 300;
      color: var(--oscd-base0);
    }
    :host([odd]) small {
      color: var(--oscd-base1);
    }
    md-icon {
      position: relative;
      top: 6px;
    }
    div {
      margin-left: 1em;
      margin-right: 1em;
    }
    th {
      font-weight: 300;
    }
    td {
      font-weight: 400;
    }
    th:first-child {
      text-align: right;
      color: var(--oscd-base1);
    }
    th:nth-child(2) {
      text-align: left;
      color: var(--oscd-base0);
      padding-left: 0.5em;
    }
    table td:nth-child(3) {
      text-align: right;
      color: var(--oscd-error);
      padding-left: 1em;
    }
    td:nth-child(4) {
      text-align: left;
      color: var(--oscd-primary);
      padding-left: 1em;
    }
    td:nth-child(4) {
      text-align: left;
      color: var(--oscd-primary);
    }
    span {
      display: block;
      transition: max-height 0.5s ease-in-out;
    }
    tr:not(:focus) span {
      max-height: 60px;
      overflow: hidden;
    }
    tr:not(:focus):hover span {
      max-height: 120px;
    }
    tr:focus {
      outline: 2px solid var(--oscd-secondary);
      outline-offset: -2px;
    }
    tr:nth-child(2n) td,
    tr:nth-child(2n) th {
      background: var(--oscd-base3);
    }
    tr:nth-child(2n + 1) td,
    tr:nth-child(2n + 1) th {
      background: var(--oscd-base2);
    }
    :host([odd]) tr:nth-child(2n) td,
    :host([odd]) tr:nth-child(2n) th {
      background: var(--oscd-base2);
    }
    :host([odd]) tr:nth-child(2n + 1) td,
    :host([odd]) tr:nth-child(2n + 1) th {
      background: var(--oscd-base3);
    }
    table {
      border: 0.25em solid var(--oscd-base3);
      table-layout: auto;
      border-collapse: collapse;
      max-width: 100%;
      margin-left: 1em;
      margin-right: 1em;
      background: none;
    }
    :host([odd]) table {
      border: 0.25em solid var(--oscd-base2);
    }
    * {
      cursor: default;
      --oscd-primary: var(--oscd-theme-primary, #2aa198);
      --oscd-secondary: var(--oscd-theme-secondary, #6c71c4);
      --oscd-error: var(--oscd-theme-error, #dc322f);
      --oscd-base03: var(--oscd-theme-base03, #002b36);
      --oscd-base02: var(--oscd-theme-base02, #073642);
      --oscd-base01: var(--oscd-theme-base01, #586e75);
      --oscd-base00: var(--oscd-theme-base00, #657b83);
      --oscd-base0: var(--oscd-theme-base0, #839496);
      --oscd-base1: var(--oscd-theme-base1, #93a1a1);
      --oscd-base2: var(--oscd-theme-base2, #eee8d5);
      --oscd-base3: var(--oscd-theme-base3, #fdf6e3);
      --oscd-text-font: var(--oscd-theme-text-font, 'Roboto');
    }
    :host {
      font-family: var(--oscd-text-font);
      display: block;
      position: relative;
      background: var(--oscd-base2);
      color: var(--oscd-base01);
    }
    :host(:last-child) {
      border-bottom: 0.25em solid var(--oscd-base3);
    }
    :host([odd]:last-child) {
      border-bottom: 0.25em solid var(--oscd-base2);
    }
    :host([odd]) {
      background: var(--oscd-base3);
      color: var(--oscd-base00);
    }
    button {
      display: block;
      text-decoration: none;
      position: sticky;
      background: var(--oscd-base2);
      width: 100%;
      border: none;
      margin: 0;
      padding: 0;
      padding-bottom: 4px;
      border-radius: 0;
      text-align: inherit;
      font: inherit;
      color: inherit;
      appearance: none;
    }
    :host([odd]) button {
      background: var(--oscd-base3);
    }
  `;
}
