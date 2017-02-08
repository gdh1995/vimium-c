/// <reference path="../content/base.d.ts" />

interface Document extends DocumentAttrsDefault {}

interface Window {
  viewer: null | {
    destroy(): any;
    show(): any;
  };
}
