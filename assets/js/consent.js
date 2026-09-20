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
     LOAD GOOGLE ANALYTICS
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

  function analyticsIsAllowed(
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
          .CONSENT_MODE_PURPOSE_STATUS_NOT_APPLICABLE
    );

  }


  /* =========================
     WAIT FOR GOOGLE CMP
  ========================== */

  window.googlefc.callbackQueue.push({

    CONSENT_MODE_DATA_READY:
      function () {

        try {

          const consentStatus =
            window.googlefc
              .getGoogleConsentModeValues();


          if (
            analyticsIsAllowed(
              consentStatus
            )
          ) {

            loadAnalytics();

          }

        } catch (error) {

          console.warn(
            "BiomedFacts: Google consent status could not be read."
          );

        }

      }

  });

})();
