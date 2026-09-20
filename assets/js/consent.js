(function () {
  "use strict";

  const MEASUREMENT_ID = "G-GPVJNXFT1R";

  let analyticsLoaded = false;


  /* =========================
     GOOGLE PRIVACY & MESSAGING
  ========================== */

  window.googlefc =
    window.googlefc || {};

  window.googlefc.callbackQueue =
    window.googlefc.callbackQueue || [];


  /* =========================
     GOOGLE ANALYTICS
  ========================== */

  function loadAnalytics() {

    if (analyticsLoaded) {
      return;
    }

    analyticsLoaded = true;


    window.dataLayer =
      window.dataLayer || [];


    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };


    window.gtag(
      "js",
      new Date()
    );


    window.gtag(
      "config",
      MEASUREMENT_ID
    );


    const googleScript =
      document.createElement(
        "script"
      );


    googleScript.async =
      true;


    googleScript.src =
      "https://www.googletagmanager.com/gtag/js?id=" +
      encodeURIComponent(
        MEASUREMENT_ID
      );


    document.head.appendChild(
      googleScript
    );

  }


  /* =========================
     ANALYTICS CONSENT
  ========================== */

  function analyticsCanLoad(
    consentStatus
  ) {

    if (
      !consentStatus ||
      !window.googlefc
        .ConsentModePurposeStatusEnum
    ) {

      return false;

    }


    const status =
      consentStatus
        .analyticsStoragePurposeConsentStatus;


    const consentEnum =
      window.googlefc
        .ConsentModePurposeStatusEnum;


    return (
      status ===
        consentEnum
          .CONSENT_MODE_PURPOSE_STATUS_GRANTED ||

      status ===
        consentEnum
          .CONSENT_MODE_PURPOSE_STATUS_NOT_APPLICABLE ||

      status ===
        consentEnum
          .CONSENT_MODE_PURPOSE_STATUS_NOT_CONFIGURED
    );

  }


  /*
    Wait until Google's CMP has determined
    the Consent Mode status.

    Analytics is then loaded only when
    analytics storage is allowed or when
    EU consent rules do not apply.
  */

  window.googlefc.callbackQueue.push({

    CONSENT_MODE_DATA_READY:
      function () {

        try {

          const consentStatus =
            window.googlefc
              .getGoogleConsentModeValues();


          if (
            analyticsCanLoad(
              consentStatus
            )
          ) {

            loadAnalytics();

          }

        } catch (error) {

          console.warn(
            "BiomedFacts: Analytics consent status could not be read."
          );

        }

      }

  });


  /* =========================
     LANGUAGE
  ========================== */

  function isEnglish() {

    return document
      .documentElement
      .lang
      .toLowerCase()
      .startsWith("en");

  }


  /* =========================
     COOKIE SETTINGS BUTTON
  ========================== */

  function addCookieSettingsStyles() {

    if (
      document.getElementById(
        "biomedfacts-cookie-settings-styles"
      )
    ) {

      return;

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "biomedfacts-cookie-settings-styles";


    style.textContent = `

      #biomedfacts-cookie-settings {
        position: fixed;
        left: 15px;
        bottom: 15px;
        z-index: 999998;

        display: none;

        padding: 8px 11px;

        background: #ffffff;
        color: #111111;

        border: 1px solid #111111;

        font-family:
          Arial,
          sans-serif;

        font-size: 10px;
        font-weight: bold;

        cursor: pointer;

        box-shadow:
          0 3px 12px
          rgba(0, 0, 0, 0.12);
      }


      #biomedfacts-cookie-settings:hover {
        border-color: #6c3bb8;
        color: #6c3bb8;
      }


      html[data-theme="dark"]
      #biomedfacts-cookie-settings {
        background: #1b1b1b;
        color: #f4f4f4;
        border-color: #f4f4f4;
      }

    `;


    document.head.appendChild(
      style
    );

  }


  function createCookieSettingsButton() {

    if (
      document.getElementById(
        "biomedfacts-cookie-settings"
      )
    ) {

      return document.getElementById(
        "biomedfacts-cookie-settings"
      );

    }


    const button =
      document.createElement(
        "button"
      );


    button.id =
      "biomedfacts-cookie-settings";


    button.type =
      "button";


    button.textContent =
      isEnglish()
        ? "Cookie settings"
        : "Ρυθμίσεις cookies";


    button.setAttribute(
      "aria-label",
      isEnglish()
        ? "Change privacy and cookie preferences"
        : "Αλλαγή προτιμήσεων απορρήτου και cookies"
    );


    button.addEventListener(
      "click",
      function () {

        if (
          window.googlefc &&
          typeof window.googlefc
            .showRevocationMessage ===
            "function"
        ) {

          window.googlefc
            .showRevocationMessage();

        }

      }
    );


    document.body.appendChild(
      button
    );


    return button;

  }


  /* =========================
     REVOCATION / SETTINGS LINK
  ========================== */

  window.googlefc.callbackQueue.push({

    CONSENT_API_READY:
      function () {

        if (
          typeof window.__tcfapi !==
          "function"
        ) {

          return;

        }


        window.__tcfapi(
          "addEventListener",
          0,
          function (
            tcData,
            success
          ) {

            const button =
              document.getElementById(
                "biomedfacts-cookie-settings"
              );


            if (!button) {
              return;
            }


            if (
              success &&
              tcData &&
              tcData.gdprApplies
            ) {

              button.style.display =
                "block";

            } else {

              button.style.display =
                "none";

            }

          }
        );

      }

  });


  /* =========================
     START
  ========================== */

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      addCookieSettingsStyles();

      createCookieSettingsButton();

    }
  );

})();
