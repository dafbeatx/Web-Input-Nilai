"use client";
import Script from "next/script";

export default function SafeStorageScript() {
  return (
    <Script
      id="safe-storage-polyfill"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          try {
            var _test = window.sessionStorage;
            var _test2 = window.localStorage;
          } catch (e) {
            console.warn("Storage access denied. Polyfilling sessionStorage and localStorage.");
            var mockStorage = {
              _data: {},
              setItem: function(id, val) { return this._data[id] = String(val); },
              getItem: function(id) { return this._data.hasOwnProperty(id) ? this._data[id] : null; },
              removeItem: function(id) { return delete this._data[id]; },
              clear: function() { return this._data = {}; },
              key: function(i) { return Object.keys(this._data)[i] || null; },
              get length() { return Object.keys(this._data).length; }
            };
            try {
              Object.defineProperty(window, 'sessionStorage', { value: mockStorage, configurable: true, enumerable: true, writable: false });
            } catch (e) {}
            try {
              Object.defineProperty(window, 'localStorage', { value: mockStorage, configurable: true, enumerable: true, writable: false });
            } catch (e) {}
          }
        `,
      }}
    />
  );
}
