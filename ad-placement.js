(() => {
  const config = window.WALID_ADS;
  if (window.self !== window.top || config?.manualPlacementsEnabled !== true) return;

  const host = document.querySelector("[data-walid-ad]");
  const placement = host?.dataset.walidAd;
  const slot = config.slots?.[placement];
  const publisher = config.publisherId;
  if (!host || !/^ca-pub-[0-9]{16}$/.test(publisher) ||
      typeof slot !== "string" || !/^[0-9]{10}$/.test(slot) || /^0+$/.test(slot)) return;

  const ad = document.createElement("ins");
  ad.className = "adsbygoogle";
  ad.style.display = "block";
  ad.dataset.adClient = publisher;
  ad.dataset.adSlot = slot;
  ad.dataset.adFormat = "auto";
  ad.dataset.fullWidthResponsive = "true";

  const label = document.createElement("div");
  label.textContent = "Advertisement";
  label.style.cssText = "font: 12px/1.5 system-ui; text-align: center; margin-bottom: 8px";

  host.style.cssText = "box-sizing: border-box; grid-column: 1 / -1; " +
    "width: calc(100% - 24px); max-width: 970px; min-width: 0; margin-inline: auto";
  host.setAttribute("aria-label", label.textContent);
  host.hidden = false;

  // Observe an empty, one-pixel target before adding any spacing or ad markup.
  host.style.minHeight = "1px";
  const viewport = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting || host.clientWidth < 250) return;
    viewport.disconnect();

    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + publisher;
    script.onerror = () => { host.hidden = true; };
    script.onload = () => {
      host.style.marginBlock = placement === "games" ? "150px 48px" : "48px";
      host.append(label, ad);
      const status = new MutationObserver(() => {
        const adStatus = ad.dataset.adStatus;
        if (adStatus === "unfilled") host.hidden = true;
        if (adStatus === "unfilled" || adStatus === "filled") status.disconnect();
      });
      status.observe(ad, { attributes: true, attributeFilter: ["data-ad-status"] });
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    };
    document.head.append(script);
  }, { rootMargin: "200px" });
  viewport.observe(host);
})();
