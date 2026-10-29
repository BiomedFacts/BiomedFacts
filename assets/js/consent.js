/* BiomedFacts — Google Privacy & Messaging + basic GA4 consent handling.
   The AdSense tag (in <head>) is responsible for loading Google's CMP.
   This file MUST be loaded before the async AdSense tag to register callbacks.
   Diagnostics are only displayed when ?cmpdebug=1 is present in the URL.
*/
(function () {
  'use strict';

  const MEASUREMENT_ID = 'G-GPVJNXFT1R';
  let analyticsLoaded = false;
  let cmpApiReady = false;
  let cmpConsentReady = false;

  // Register with Google's API before AdSense begins loading asynchronously.
  window.googlefc = window.googlefc || {};
  window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];

  function analyticsIsAllowed(consentStatus) {
    const enums = window.googlefc.ConsentModePurposeStatusEnum;
    if (!consentStatus || !enums) return false;

    const value = consentStatus.analyticsStoragePurposeConsentStatus;

    // Guard against undefined consent values.
    return typeof value === 'number' &&
      (value === enums.GRANTED || value === enums.NOT_APPLICABLE);
  }

  function loadAnalytics() {
    if (analyticsLoaded) return;

    analyticsLoaded = true;

    window.dataLayer = window.dataLayer || [];

    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID);

    const script = document.createElement('script');

    script.async = true;

    script.src =
      'https://www.googletagmanager.com/gtag/js?id=' +
      encodeURIComponent(MEASUREMENT_ID);

    document.head.appendChild(script);
  }

  function activateCookieSettingsLinks() {
    const reveal = function () {
      document.querySelectorAll('[data-cookie-settings]').forEach(
        function (link) {
          link.hidden = false;

          link.addEventListener('click', function (event) {
            event.preventDefault();

            if (
              window.googlefc &&
              typeof window.googlefc.showRevocationMessage === 'function'
            ) {
              window.googlefc.showRevocationMessage();
            }
          });
        }
      );
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', reveal, {
        once: true
      });
    } else {
      reveal();
    }
  }

  window.googlefc.callbackQueue.push({
    CONSENT_API_READY: function () {
      cmpApiReady = true;
      activateCookieSettingsLinks();
    }
  });

  window.googlefc.callbackQueue.push({
    CONSENT_MODE_DATA_READY: function () {
      cmpConsentReady = true;

      try {
        const consentStatus =
          window.googlefc.getGoogleConsentModeValues();

        if (analyticsIsAllowed(consentStatus)) {
          loadAnalytics();
        }
      } catch (error) {
        console.warn(
          'BiomedFacts: CMP consent mode data could not be read.',
          error
        );
      }
    }
  });

  // Optional diagnostics, visible only with ?cmpdebug=1.
  if (
    new URLSearchParams(window.location.search).get('cmpdebug') === '1'
  ) {
    function renderDiagnostics() {
      const box = document.getElementById('bf-cmp-debug');

      if (!box) return;

      const adsTag = document.getElementById('bf-adsense-tag');

      const resources = performance.getEntriesByType('resource')
        .filter(function (entry) {
          return /googlesyndication|fundingchoices|googletagmanager|googlefc/i
            .test(entry.name);
        })
        .map(function (entry) {
          try {
            return new URL(entry.name).hostname;
          } catch (_) {
            return entry.name;
          }
        });

      const data = [
        'AdSense script present: ' +
          (adsTag ? 'YES' : 'NO'),

        'AdSense script status: ' +
          (window.biomedfactsAdsTagState || 'PENDING/UNKNOWN'),

        'Publisher tag: ' +
          (
            adsTag &&
            adsTag.src.includes('ca-pub-5074253584827466')
              ? 'EXPECTED ID'
              : 'CHECK ID'
          ),

        'Google CMP API ready: ' +
          (cmpApiReady ? 'YES' : 'NO'),

        'Google consent data ready: ' +
          (cmpConsentReady ? 'YES' : 'NO'),

        'TCF API available: ' +
          (
            typeof window.__tcfapi === 'function'
              ? 'YES'
              : 'NO'
          ),

        'Google CMP method loaded: ' +
          (
            typeof window.googlefc.showRevocationMessage === 'function'
              ? 'YES'
              : 'NO'
          ),

        'Referrer policy meta: ' +
          (
            document.querySelector('meta[name="referrer"]')?.content ||
            'not set'
          ),

        'Google resource hosts: ' +
          (
            resources.length
              ? [...new Set(resources)].join(', ')
              : 'none recorded'
          ),

        'GA4 loaded with consent: ' +
          (analyticsLoaded ? 'YES' : 'NO')
      ];

      box.querySelector('pre').textContent = data.join('\n');
    }

    function createDebugBox() {
      const box = document.createElement('aside');

      box.id = 'bf-cmp-debug';
      box.setAttribute('role', 'status');

      box.style.cssText =
        'position:fixed;' +
        'left:8px;' +
        'bottom:8px;' +
        'max-width:min(95vw,400px);' +
        'max-height:65vh;' +
        'overflow:auto;' +
        'z-index:2147483647;' +
        'background:#fff;' +
        'color:#111;' +
        'border:2px solid #362c51;' +
        'border-radius:10px;' +
        'padding:12px;' +
        'font:12px/1.5 monospace;' +
        'box-shadow:0 2px 15px #0004;' +
        'text-align:left';

      const title = document.createElement('strong');
      title.textContent = 'BiomedFacts — CMP diagnostics';

      const pre = document.createElement('pre');

      pre.style.cssText =
        'white-space:pre-wrap;' +
        'overflow-wrap:anywhere;' +
        'margin:8px 0';

      const copy = document.createElement('button');

      copy.type = 'button';
      copy.textContent = 'Copy diagnostic result';

      copy.addEventListener('click', function () {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(pre.textContent);
        }
      });

      const close = document.createElement('button');

      close.type = 'button';
      close.textContent = 'Close';
      close.style.marginLeft = '8px';

      close.addEventListener('click', function () {
        box.remove();
      });

      box.append(title, pre, copy, close);
      document.body.appendChild(box);

      renderDiagnostics();

      const interval = setInterval(function () {
        if (!box.isConnected) {
          clearInterval(interval);
          return;
        }

        renderDiagnostics();
      }, 1000);

      setTimeout(function () {
        clearInterval(interval);
        renderDiagnostics();
      }, 20000);
    }

    if (document.readyState === 'loading') {
      document.addEventListener(
        'DOMContentLoaded',
        createDebugBox,
        { once: true }
      );
    } else {
      createDebugBox();
    }
  }
})();
