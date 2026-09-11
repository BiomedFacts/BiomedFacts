(function () {
  "use strict";

  const MEASUREMENT_ID = "G-GPVJNXFT1R";

  const STORAGE_KEY =
    "biomedfacts-analytics-consent";

  const GA_DISABLE_KEY =
    "ga-disable-" + MEASUREMENT_ID;

  let analyticsLoaded = false;


  /* =========================
     GOOGLE CONSENT MODE
  ========================== */

  window.dataLayer =
    window.dataLayer || [];

  window.gtag =
    window.gtag ||
    function () {
      window.dataLayer.push(arguments);
    };


  /*
    Default state:
    Analytics and advertising-related
    storage are denied.
  */

  window.gtag(
    "consent",
    "default",
    {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    }
  );


  /* =========================
     DELETE ANALYTICS COOKIES
  ========================== */

  function deleteCookie(
    name,
    domain
  ) {

    let cookieString =
      encodeURIComponent(name) +
      "=; Max-Age=0; path=/; SameSite=Lax";

    if (domain) {

      cookieString +=
        "; domain=" + domain;

    }

    document.cookie =
      cookieString;

  }


  function clearAnalyticsCookies() {

    const cookieNames =
      document.cookie
        .split(";")
        .map(function (cookie) {

          return decodeURIComponent(
            cookie
              .trim()
              .split("=")[0]
          );

        });


    const analyticsCookieNames =
      cookieNames.filter(
        function (name) {

          return (
            name === "_ga" ||
            name.indexOf("_ga_") === 0 ||
            name === "_gid" ||
            name.indexOf("_gat") === 0
          );

        }
      );


    analyticsCookieNames.forEach(
      function (name) {

        /*
          Try removing host-only cookie.
        */

        deleteCookie(
          name,
          null
        );


        /*
          Try removing cookies set for
          the root domain.
        */

        deleteCookie(
          name,
          "biomedfacts.com"
        );

        deleteCookie(
          name,
          ".biomedfacts.com"
        );

      }
    );

  }


  /* =========================
     LOAD GOOGLE ANALYTICS
     ONLY AFTER CONSENT
  ========================== */

  function loadAnalytics() {

    /*
      Allow Google Analytics again
      if the user previously revoked
      consent in this browser session.
    */

    window[GA_DISABLE_KEY] =
      false;


    window.gtag(
      "consent",
      "update",
      {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
      }
    );


    if (analyticsLoaded) {

      return;

    }


    analyticsLoaded =
      true;


    /*
      Queue Google Analytics commands
      before the external script loads.
    */

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
     ACCEPT CONSENT
  ========================== */

  function acceptAnalytics() {

    localStorage.setItem(
      STORAGE_KEY,
      "granted"
    );


    loadAnalytics();


    closeBanner();

  }


  /* =========================
     REJECT / REVOKE CONSENT
  ========================== */

  function rejectAnalytics() {

    localStorage.setItem(
      STORAGE_KEY,
      "denied"
    );


    /*
      Update Consent Mode.
    */

    window.gtag(
      "consent",
      "update",
      {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
      }
    );


    /*
      Disable further GA collection
      on the current page if the
      Analytics library had already
      been loaded.
    */

    window[GA_DISABLE_KEY] =
      true;


    /*
      Remove accessible Google
      Analytics cookies.
    */

    clearAnalyticsCookies();


    closeBanner();

  }


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
     STYLES
  ========================== */

  function addStyles() {

    if (
      document.getElementById(
        "biomedfacts-consent-styles"
      )
    ) {

      return;

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "biomedfacts-consent-styles";


    style.textContent = `

      #biomedfacts-consent-banner {
        position: fixed;

        left: 0;
        right: 0;
        bottom: 0;

        z-index: 999999;

        padding: 18px;

        background:
          rgba(17, 17, 17, 0.98);

        color: #ffffff;

        border-top:
          3px solid #6c3bb8;

        font-family:
          Arial,
          sans-serif;

        box-shadow:
          0 -6px 30px
          rgba(0, 0, 0, 0.18);
      }


      .biomedfacts-consent-inner {
        width:
          min(1100px, 100%);

        margin:
          0 auto;

        display:
          flex;

        align-items:
          center;

        justify-content:
          space-between;

        gap:
          28px;
      }


      .biomedfacts-consent-copy {
        max-width:
          720px;
      }


      .biomedfacts-consent-title {
        margin:
          0 0 7px;

        font-family:
          "Times New Roman",
          Times,
          serif;

        font-size:
          20px;

        font-weight:
          bold;
      }


      .biomedfacts-consent-text {
        margin:
          0;

        color:
          #dddddd;

        font-size:
          13px;

        line-height:
          1.55;
      }


      .biomedfacts-consent-text a {
        color:
          #c6a9ff;

        text-decoration:
          underline;

        text-underline-offset:
          2px;
      }


      .biomedfacts-consent-actions {
        display:
          flex;

        flex-shrink:
          0;

        gap:
          10px;
      }


      .biomedfacts-consent-button {
        min-width:
          125px;

        padding:
          12px 17px;

        border:
          1px solid #ffffff;

        font-family:
          Arial,
          sans-serif;

        font-size:
          12px;

        font-weight:
          bold;

        cursor:
          pointer;

        transition:
          transform 0.15s ease,
          background 0.15s ease;
      }


      .biomedfacts-consent-button:hover {
        transform:
          translateY(-1px);
      }


      .biomedfacts-consent-accept {
        background:
          #6c3bb8;

        border-color:
          #6c3bb8;

        color:
          #ffffff;
      }


      .biomedfacts-consent-reject {
        background:
          #ffffff;

        border-color:
          #ffffff;

        color:
          #111111;
      }


      #biomedfacts-cookie-settings {
        position:
          fixed;

        left:
          15px;

        bottom:
          15px;

        z-index:
          999998;

        padding:
          8px 11px;

        background:
          #ffffff;

        color:
          #111111;

        border:
          1px solid #111111;

        font-family:
          Arial,
          sans-serif;

        font-size:
          10px;

        font-weight:
          bold;

        cursor:
          pointer;

        box-shadow:
          0 3px 12px
          rgba(0, 0, 0, 0.12);
      }


      #biomedfacts-cookie-settings:hover {
        border-color:
          #6c3bb8;

        color:
          #6c3bb8;
      }


      html[data-theme="dark"]
      #biomedfacts-cookie-settings {
        background:
          #1b1b1b;

        color:
          #f4f4f4;

        border-color:
          #f4f4f4;
      }


      @media (max-width: 760px) {

        #biomedfacts-consent-banner {
          padding:
            17px 16px;
        }


        .biomedfacts-consent-inner {
          align-items:
            stretch;

          flex-direction:
            column;

          gap:
            16px;
        }


        .biomedfacts-consent-actions {
          width:
            100%;
        }


        .biomedfacts-consent-button {
          flex:
            1;

          min-width:
            0;
        }


        .biomedfacts-consent-title {
          font-size:
            19px;
        }


        .biomedfacts-consent-text {
          font-size:
            12px;
        }

      }


      @media (max-width: 430px) {

        .biomedfacts-consent-actions {
          flex-direction:
            column;
        }


        .biomedfacts-consent-button {
          width:
            100%;
        }

      }

    `;


    document.head.appendChild(
      style
    );

  }


  /* =========================
     COOKIE SETTINGS BUTTON
  ========================== */

  function createSettingsButton() {

    if (
      document.getElementById(
        "biomedfacts-cookie-settings"
      )
    ) {

      return;

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
        ? "Change cookie preferences"
        : "Αλλαγή προτιμήσεων cookies"
    );


    button.addEventListener(
      "click",
      function () {

        showBanner();

      }
    );


    document.body.appendChild(
      button
    );

  }


  /* =========================
     CONSENT BANNER
  ========================== */

  function showBanner() {

    const existingBanner =
      document.getElementById(
        "biomedfacts-consent-banner"
      );


    if (existingBanner) {

      existingBanner.style.display =
        "block";

      return;

    }


    const english =
      isEnglish();


    const banner =
      document.createElement(
        "div"
      );


    banner.id =
      "biomedfacts-consent-banner";


    banner.setAttribute(
      "role",
      "dialog"
    );


    banner.setAttribute(
      "aria-modal",
      "true"
    );


    banner.setAttribute(
      "aria-label",
      english
        ? "Cookie preferences"
        : "Προτιμήσεις cookies"
    );


    const inner =
      document.createElement(
        "div"
      );


    inner.className =
      "biomedfacts-consent-inner";


    const copy =
      document.createElement(
        "div"
      );


    copy.className =
      "biomedfacts-consent-copy";


    const title =
      document.createElement(
        "p"
      );


    title.className =
      "biomedfacts-consent-title";


    title.textContent =
      english
        ? "Analytics & privacy"
        : "Analytics & ιδιωτικότητα";


    const text =
      document.createElement(
        "p"
      );


    text.className =
      "biomedfacts-consent-text";


    if (english) {

      text.innerHTML =
        'BiomedFacts uses Google Analytics only with your consent to understand website traffic and improve its content. If you reject analytics, Google Analytics will not be loaded on future page loads. You can change your choice at any time. <a href="/en/privacy-policy/">Privacy Policy</a>.';

    } else {

      text.innerHTML =
        'Το BiomedFacts χρησιμοποιεί Google Analytics μόνο με τη συγκατάθεσή σου, ώστε να κατανοεί την επισκεψιμότητα και να βελτιώνει το περιεχόμενό του. Αν απορρίψεις τα analytics, το Google Analytics δεν θα φορτώνεται στις επόμενες σελίδες. Μπορείς να αλλάξεις την επιλογή σου οποιαδήποτε στιγμή. <a href="/privacy-policy/">Πολιτική Απορρήτου</a>.';

    }


    copy.appendChild(
      title
    );


    copy.appendChild(
      text
    );


    const actions =
      document.createElement(
        "div"
      );


    actions.className =
      "biomedfacts-consent-actions";


    const rejectButton =
      document.createElement(
        "button"
      );


    rejectButton.type =
      "button";


    rejectButton.className =
      "biomedfacts-consent-button biomedfacts-consent-reject";


    rejectButton.textContent =
      english
        ? "Reject"
        : "Απόρριψη";


    const acceptButton =
      document.createElement(
        "button"
      );


    acceptButton.type =
      "button";


    acceptButton.className =
      "biomedfacts-consent-button biomedfacts-consent-accept";


    acceptButton.textContent =
      english
        ? "Accept analytics"
        : "Αποδοχή analytics";


    rejectButton.addEventListener(
      "click",
      rejectAnalytics
    );


    acceptButton.addEventListener(
      "click",
      acceptAnalytics
    );


    actions.appendChild(
      rejectButton
    );


    actions.appendChild(
      acceptButton
    );


    inner.appendChild(
      copy
    );


    inner.appendChild(
      actions
    );


    banner.appendChild(
      inner
    );


    document.body.appendChild(
      banner
    );

  }


  function closeBanner() {

    const banner =
      document.getElementById(
        "biomedfacts-consent-banner"
      );


    if (banner) {

      banner.style.display =
        "none";

    }

  }


  /* =========================
     START
  ========================== */

  const savedConsent =
    localStorage.getItem(
      STORAGE_KEY
    );


  if (
    savedConsent === "granted"
  ) {

    window[GA_DISABLE_KEY] =
      false;

    loadAnalytics();

  } else {

    /*
      If consent has not been granted,
      GA stays disabled.
    */

    window[GA_DISABLE_KEY] =
      true;

  }


  document.addEventListener(
    "DOMContentLoaded",
    function () {

      addStyles();

      createSettingsButton();


      if (
        savedConsent !== "granted" &&
        savedConsent !== "denied"
      ) {

        showBanner();

      }

    }
  );

})();
