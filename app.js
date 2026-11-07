
    "use strict";

    const API = String(window.WALID_AI_API || "").trim().replace(/\/$/, "");

    const loginModal = document.getElementById("loginModal");
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logout");
    const accountMenuWrap = document.getElementById("accountMenuWrap");
    const accountAvatar = document.getElementById("accountAvatar");
    const accountPopover = document.getElementById("accountPopover");
    const accountPopoverName = document.getElementById("accountPopoverName");
    const loginStatus = document.getElementById("loginStatus");
    const googleButton = document.getElementById("googleButton");
    const emailInput = document.getElementById("emailInput");
    const emailButton = document.getElementById("emailButton");
    const chatToolsBtn = document.getElementById("chatToolsBtn");
    const chatToolsModal = document.getElementById("chatToolsModal");
    const form = document.getElementById("form");
    const input = document.getElementById("question");
    const chat = document.getElementById("chat");
    const send = document.getElementById("send");
    const welcome = document.querySelector(".welcome");
    let welcomeHideTimer = 0;
    function restoreWelcome() {
      window.clearTimeout(welcomeHideTimer);
      welcome.classList.remove("is-exiting", "hidden");
      welcome.setAttribute("aria-hidden", "false");
    }
    function dismissWelcome() {
      if (welcome.classList.contains("hidden") || welcome.classList.contains("is-exiting")) return;
      welcome.setAttribute("aria-hidden", "true");
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        welcome.classList.add("hidden");
        return;
      }
      welcome.classList.add("is-exiting");
      welcomeHideTimer = window.setTimeout(() => welcome.classList.add("hidden"), 400);
    }
    const languageSelect = document.getElementById("languageSelect");
    const signupBtn = document.getElementById("signupBtn");
    const signedInProfile = document.getElementById("signedInProfile");
    const sidebarLogin = document.getElementById("sidebarLogin");
    const helpModal = document.getElementById("helpModal");
    const settingsModal = document.getElementById("settingsModal");
    const profileAvatar = document.getElementById("profileAvatar");
    const profileCopy = document.getElementById("profileCopy");
    const historyList = document.getElementById("historyList");
    const adminCelebration = document.getElementById("adminCelebration");
    const sidebar = document.querySelector(".sidebar");
    const mobileMenu = document.getElementById("mobileMenu");
    const sidebarBackdrop = document.getElementById("sidebarBackdrop");
    let adminCelebrationTimer = null;
    let pendingUploads = [];
    let uploadQuota = null;

    let firestoreDB = null;
    let historyOwner = "";
    let currentConversationId = newConversationId();
    let chatMessages = [];
    let restoringChat = false;
    let persistQueue = Promise.resolve();

    const legacySessionToken = sessionStorage.getItem("walidToken") || "";
    try { localStorage.removeItem("walidAdminAccess"); } catch {}
    let ACCESS_TOKEN = sessionStorage.getItem("walidAdminAccess") || "";
    if (!ACCESS_TOKEN && legacySessionToken && legacySessionToken.split(".").length !== 3) {
      ACCESS_TOKEN = legacySessionToken;
    }
    if (ACCESS_TOKEN.split(".").length === 3) {
      sessionStorage.removeItem("walidAdminAccess");
      ACCESS_TOKEN = "";
    }
    if (legacySessionToken.split(".").length === 3) {
      sessionStorage.removeItem("walidToken");
    }
    let IS_ADMIN = false;
    let firebaseAuth = null;
    let authorizedUid = "";
    let authorizingUid = "";

    function newConversationId() {
      return window.crypto?.randomUUID?.() ||
        "chat-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    }

    function getGuestClientId() {
      try {
        let id = localStorage.getItem("walidGuestId");
        if (!id) {
          id = window.crypto?.randomUUID?.() ||
            "guest-" + Date.now() + "-" + Math.random().toString(36).slice(2);
          localStorage.setItem("walidGuestId", id);
        }
        return id;
      } catch {
        return "";
      }
    }

    function setProfile(name, admin = false) {
      const cleanName = String(name || "Guest").trim() || "Guest";
      profileAvatar.textContent = admin ? "♛" : cleanName.charAt(0).toLocaleUpperCase();
      profileAvatar.setAttribute("aria-label", admin ? "Boss" : cleanName + "-এর প্রোফাইল");
      profileCopy.replaceChildren();
      profileCopy.append(document.createTextNode(admin ? "Boss" : cleanName));
      const note = document.createElement("small");
      note.textContent = admin ? "Whakil Ahamed Shakil" : historyOwner
        ? (languageSelect.value === "bn" ? "ব্যক্তিগত অ্যাকাউন্ট" : "Personal account")
        : (languageSelect.value === "bn" ? "এই ব্রাউজারে সংরক্ষিত" : "Saved on this browser");
      profileCopy.appendChild(note);
      const signedIn = Boolean(ACCESS_TOKEN);
      chatToolsBtn.classList.toggle("hidden", !signedIn);
      signedInProfile.classList.toggle("hidden", !signedIn);
      sidebarLogin.classList.toggle("hidden", signedIn);
      accountMenuWrap.classList.toggle("hidden", !signedIn);
      loginBtn.classList.toggle("hidden", signedIn);
      signupBtn.classList.toggle("hidden", signedIn);
      accountAvatar.textContent = admin ? "♛" : cleanName.charAt(0).toLocaleUpperCase();
      accountAvatar.setAttribute("aria-label", admin ? "Boss account menu" : cleanName + " account menu");
      accountPopoverName.textContent = admin ? "Boss · Whakil Ahamed Shakil" : cleanName;
    }

    function showAdminCelebration() {
      if (!IS_ADMIN || !adminCelebration) return;
      window.clearTimeout(adminCelebrationTimer);
      adminCelebration.classList.add("show");
      adminCelebration.setAttribute("aria-hidden", "false");
      adminCelebrationTimer = window.setTimeout(hideAdminCelebration, 6200);
    }

    function hideAdminCelebration() {
      window.clearTimeout(adminCelebrationTimer);
      adminCelebration.classList.remove("show");
      adminCelebration.setAttribute("aria-hidden", "true");
    }

    document.getElementById("closeAdminCelebration").addEventListener("click", hideAdminCelebration);

    function drawHistory(records) {
      historyList.replaceChildren();
      records.slice().sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0)).forEach((record) => {
        const row = document.createElement("div"); row.className = "history-row";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "history-item";
        button.textContent = record.title || (languageSelect.value === "bn" ? "নতুন চ্যাট" : "New chat");
        button.addEventListener("click", () => openConversation(record));
        const remove = document.createElement("button"); remove.type = "button"; remove.className = "history-delete"; remove.textContent = "×"; remove.title = languageSelect.value === "bn" ? "এই চ্যাট মুছুন" : "Delete this chat"; remove.setAttribute("aria-label", remove.title);
        remove.addEventListener("click", async (event) => {
          event.stopPropagation();
          const confirmed = confirm(languageSelect.value === "en" ? "Delete this chat?" : "এই চ্যাটটি মুছে ফেলবেন?");
          if (!confirmed) return;
          try {
            if (historyOwner && firestoreDB) await firestoreDB.collection("users").doc(historyOwner).collection("chats").doc(record.id).delete();
            else sessionStorage.setItem("walidGuestChats", JSON.stringify(guestRecords().filter((item) => item.id !== record.id)));
            if (currentConversationId === record.id) {
              currentConversationId = newConversationId(); chatMessages = []; chat.replaceChildren(); restoreWelcome(); rememberActiveConversation();
            }
            drawHistory(historyOwner ? await loadAccountRecords(false) : guestRecords());
          } catch { addMessage("error", languageSelect.value === "bn" ? "চ্যাটটি মোছা যায়নি। পরে আবার চেষ্টা করুন।" : "This chat could not be deleted. Try again later."); }
        });
        row.append(button, remove); historyList.appendChild(row);
      });
    }

    function guestRecords() {
      try { return JSON.parse(sessionStorage.getItem("walidGuestChats") || "[]"); }
      catch { return []; }
    }

    function accountChatKey(uid) {
      return "walidActiveChatId:" + uid;
    }

    function rememberActiveConversation() {
      if (historyOwner) {
        localStorage.setItem(accountChatKey(historyOwner), currentConversationId);
      } else {
        sessionStorage.setItem("walidActiveChatId", currentConversationId);
      }
    }

    function restoreGuestConversation() {
      const records = guestRecords().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      drawHistory(records);
      const savedId = sessionStorage.getItem("walidActiveChatId");
      const active = records.find((record) => record.id === savedId) || (!savedId ? records[0] : null);
      if (active) {
        openConversation(active);
      } else if (savedId) {
        currentConversationId = savedId;
      }
    }

    function persistConversation() {
      if (restoringChat || !chatMessages.length) return;
      rememberActiveConversation();
      const record = {
        id: currentConversationId,
        title: (chatMessages.find((item) => item.kind === "user")?.text || (languageSelect.value === "bn" ? "নতুন চ্যাট" : "New chat")).slice(0, 72),
        messages: chatMessages.slice(-40).map((item) => ({
          kind: item.kind,
          text: String(item.text || "").slice(0, 8000),
          source: item.source || ""
        })),
        updatedAt: Date.now()
      };
      const ownerAtSave = historyOwner;
      persistQueue = persistQueue.then(async () => {
        if (ownerAtSave && firestoreDB) {
          try {
            await firestoreDB.collection("users").doc(ownerAtSave)
              .collection("chats").doc(record.id).set(record, { merge: true });
          } catch (error) {
            const smaller = { ...record, messages: record.messages.slice(-12) };
            await firestoreDB.collection("users").doc(ownerAtSave)
              .collection("chats").doc(record.id).set(smaller, { merge: true });
            console.warn("Chat history was saved without the oldest messages.", error);
          }
        } else {
          const records = guestRecords().filter((item) => item.id !== record.id);
          records.unshift(record);
          const keep = records.slice(0, 50);
          try {
            sessionStorage.setItem("walidGuestChats", JSON.stringify(keep));
          } catch (error) {
            sessionStorage.setItem("walidGuestChats", JSON.stringify(keep.slice(0, 10)));
            console.warn("Guest chat history was shortened to fit this browser.", error);
          }
        }
        drawHistory(ownerAtSave ? await loadAccountRecords(false) : guestRecords());
      }).catch((error) => console.warn("Chat history could not be saved.", error));
      return persistQueue;
    }

    async function loadAccountRecords(render = true) {
      if (!historyOwner || !firestoreDB) return [];
      const snapshot = await firestoreDB.collection("users").doc(historyOwner).collection("chats").get();
      const records = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
      if (render) drawHistory(records);
      return records;
    }

    function openConversation(record) {
      restoringChat = true;
      currentConversationId = record.id;
      chatMessages = Array.isArray(record.messages) ? record.messages : [];
      chat.replaceChildren();
      chatMessages.forEach((item) => addMessage(item.kind, item.text, item.source || ""));
      if (chatMessages.length > 0) dismissWelcome(); else restoreWelcome();
      restoringChat = false;
      rememberActiveConversation();
    }

    const firebaseConfig = window.WALID_FIREBASE_CONFIG || {};
    const firebaseReady = Boolean(
      firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
    );

    setProfile("Guest");
    restoreGuestConversation();
    function setLanguage(language) {
      const lang = language === "bn" ? "bn" : "en";
      document.documentElement.lang = lang;
      document.documentElement.dataset.uiLanguage = lang;
      document.title = lang === "bn" ? "Walid AI — বাংলাদেশের AI চ্যাট, টুল ও গেম" : "Walid AI — Bangladeshi AI chat, tools, and games";
      const pageDescription = lang === "bn"
        ? "ইংরেজি বা বাংলায় Walid AI-কে প্রশ্ন করুন। বিনামূল্যে চ্যাট, PDF ও ছবির টুল, ZIP ফাইল এবং ব্রাউজার গেম।"
        : "Ask Walid AI in English or Bangla. Free chat, PDF and image tools, ZIP files, and browser games from one Bangladeshi site.";
      document.querySelector('meta[name="description"]')?.setAttribute("content", pageDescription);
      document.querySelector('meta[property="og:title"]')?.setAttribute("content", document.title);
      document.querySelector('meta[property="og:description"]')?.setAttribute("content", pageDescription);
      document.querySelector('meta[property="og:locale"]')?.setAttribute("content", lang === "bn" ? "bn_BD" : "en_US");
      document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", document.title);
      document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", pageDescription);
      languageSelect.value = lang;
      const text = {
        bn: { newChat:"নতুন চ্যাট", history:"চ্যাটের ইতিহাস", sidebarInfo:"আরও প্রশ্ন ও ফাইল আপলোডের জন্য লগ ইন করুন।", welcome:"ওয়ালিদ AI-কে প্রশ্ন করুন...", placeholder:"Walid AI-কে প্রশ্ন করুন...", login:"লগ ইন করুন", signup:"বিনামূল্যে নিবন্ধন", logout:"লগ আউট", loginDesc:"আপনার Walid AI অ্যাকাউন্টে প্রবেশ করুন।", signupTitle:"নতুন অ্যাকাউন্ট তৈরি করুন", help:"সহায়তা", settings:"সেটিংস", language:"ভাষা", tagline:"বাংলাদেশের AI", aboutUs:"আমাদের সম্পর্কে", contactUs:"যোগাযোগ", privacyPolicy:"গোপনীয়তা নীতি", termsOfService:"ব্যবহারের শর্তাবলি", thirdPartyLicenses:"তৃতীয় পক্ষের লাইসেন্স",
          helpTitle:"সহায়তা কেন্দ্র", faqTab:"সাধারণ প্রশ্ন", contactTab:"সহায়তায় যোগাযোগ", helpMailNote:"Send Email চাপলে আপনার ইমেইল অ্যাপে নিচের তথ্যসহ খসড়া খুলবে। খসড়াটি দেখে সেই অ্যাপ থেকেই Send চাপুন।", helpCategoryLabel:"সমস্যার ধরন", catGeneral:"সাধারণ প্রশ্ন", catAccount:"অ্যাকাউন্ট বা লগইন", catChat:"চ্যাট বা উত্তর", catTool:"ফাইল বা টুল", catOther:"অন্যান্য", helpSubjectLabel:"বিষয়", helpMessageLabel:"বার্তা", sendEmail:"ইমেইল পাঠান", helpAlternative:"অথবা ইমেইল করুন:", mailReady:"আপনার ইমেইল অ্যাপে খসড়াটি খোলা হয়েছে। পাঠাতে সেখানে Send চাপুন।", mailFallback:"ইমেইল অ্যাপ খুলছে না? এই ঠিকানায় লিখুন: support@walid-ai.com",
          faqChatQ:"চ্যাট কীভাবে শুরু করব?", faqChatA:"চ্যাটের ঘরে প্রশ্ন লিখে Send চাপুন।", faqLangQ:"ওয়েবসাইটের ভাষা কোথায় বদলাব?", faqLangA:"Settings খুলে English বা বাংলা বেছে নিন। পছন্দটি এই ব্রাউজারে সংরক্ষিত থাকে।", faqFilesQ:"চ্যাটে ফাইল কীভাবে যোগ করব?", faqFilesA:"চ্যাট বক্সের পাশের প্লাস বোতাম ব্যবহার করুন। চ্যাটে ফাইল যোগ করতে লগইন প্রয়োজন।", faqToolsQ:"PDF, ছবি ও ZIP টুল কোথায়?", faqToolsA:"সাইডবারের Tools বা Tools পেজ খুলে প্রয়োজনীয় টুল বেছে নিন।", faqConvertQ:"কোন ছবির ফরম্যাট বদলানো যায়?", faqConvertA:"Convert Image টুলে JPG, PNG ও WebP ব্যবহার করা যায়." },
        en: { newChat:"New chat", history:"Recent chats", sidebarInfo:"Log in for more questions and file uploads.", welcome:"Ask Walid AI...", placeholder:"Ask Walid AI...", login:"Log in", signup:"Sign up for free", logout:"Log out", loginDesc:"Continue to your Walid AI account.", signupTitle:"Create your account", help:"Help", settings:"Settings", language:"Language", tagline:"Bangladeshi AI", aboutUs:"About Us", contactUs:"Contact Us", privacyPolicy:"Privacy Policy", termsOfService:"Terms of Service", thirdPartyLicenses:"Third-Party Licenses",
          helpTitle:"Help Center", faqTab:"FAQs", contactTab:"Contact Support", helpMailNote:"Send Email opens your email app with the details below. Review the draft and press Send in that app.", helpCategoryLabel:"Issue category", catGeneral:"General question", catAccount:"Account or sign-in", catChat:"Chat or answer", catTool:"File or tool", catOther:"Other", helpSubjectLabel:"Subject", helpMessageLabel:"Message", sendEmail:"Send Email", helpAlternative:"Or email:", mailReady:"Your email app should open with a draft. Press Send there to send it.", mailFallback:"If your email app did not open, email support@walid-ai.com directly.",
          faqChatQ:"How do I start a chat?", faqChatA:"Type your question in the chat box and press Send.", faqLangQ:"Where can I change the interface language?", faqLangA:"Open Settings and choose English or বাংলা. The choice is saved in this browser.", faqFilesQ:"How do I attach a file in chat?", faqFilesA:"Use the plus button beside the chat box. Sign-in is required for chat file uploads.", faqToolsQ:"Where are the PDF, image, and ZIP tools?", faqToolsA:"Open Tools from the sidebar or the Tools page to choose a tool.", faqConvertQ:"Which image formats can I convert?", faqConvertA:"The Convert Image tool supports JPG, PNG, and WebP." }
      }[lang];
      document.querySelector('[data-i18n="newChat"]').textContent = text.newChat;
      document.querySelector('[data-i18n="history"]').textContent = text.history;
      document.querySelector('[data-i18n="sidebarInfo"]').textContent = text.sidebarInfo;
      document.querySelector('[data-i18n="help"]').textContent = text.help;
      document.querySelector('[data-i18n="settings"]').textContent = text.settings;
      document.querySelector('[data-i18n="language"]').textContent = text.language;
      document.getElementById("settingsAboutLink").textContent = text.aboutUs;
      document.getElementById("settingsContactLink").textContent = text.contactUs;
      document.getElementById("settingsPrivacyLink").textContent = text.privacyPolicy;
      document.getElementById("settingsTermsLink").textContent = text.termsOfService;
      document.getElementById("welcomeTitle").textContent = text.welcome;
      input.setAttribute("aria-label", lang === "bn" ? "প্রশ্ন লিখুন" : "Ask a question");
      document.getElementById("attachBtn").setAttribute("aria-label", lang === "bn" ? "ফাইল বা ছবি যোগ করুন" : "Add files or photos");
      document.getElementById("attachBtn").title = lang === "bn" ? "ফাইল বা ছবি যোগ করুন" : "Add files or photos";
      document.querySelector('#attachMenu [data-upload-kind="file"]').textContent = lang === "bn" ? "ফাইল আপলোড" : "Upload files";
      document.querySelector('#attachMenu [data-upload-kind="photo"]').textContent = lang === "bn" ? "ছবি আপলোড" : "Upload photos";
      document.getElementById("helpTitle").textContent = text.helpTitle;
      document.getElementById("helpFaqTab").textContent = text.faqTab;
      document.getElementById("helpContactTab").textContent = text.contactTab;
      document.querySelectorAll("[data-help-i18n]").forEach((element) => { const key = element.dataset.helpI18n; if (text[key]) element.textContent = text[key]; });
      document.getElementById("helpSubject").placeholder = lang === "bn" ? "যেমন: ফাইল আপলোড হচ্ছে না" : "For example: File upload is not working";
      document.getElementById("helpMessage").placeholder = lang === "bn" ? "আপনার সমস্যাটি লিখুন" : "Describe the issue";
      document.getElementById("closeLogin").setAttribute("aria-label", lang === "bn" ? "বন্ধ করুন" : "Close");
      input.placeholder = text.placeholder;
      send.setAttribute("aria-label", lang === "bn" ? "পাঠান" : "Send");
      loginBtn.textContent = text.login;
      signupBtn.textContent = text.signup;
      logoutBtn.textContent = text.logout;
      document.getElementById("sidebarLoginBtn").textContent = text.login;
      document.getElementById("loginDescription").textContent = text.loginDesc;
      document.getElementById("loginTitle").textContent = loginMode === "signup" ? text.signupTitle : text.login;
      
    }

    let loginMode = "login";
    try { languageSelect.value = localStorage.getItem("walidLanguagePreference") || "en"; } catch { languageSelect.value = "en"; }
    languageSelect.addEventListener("change", () => { try { localStorage.setItem("walidLanguagePreference", languageSelect.value); } catch {} setLanguage(languageSelect.value); });
    setLanguage(languageSelect.value);


    function openLogin(mode = "login") {
      loginMode = mode;
      setLanguage(languageSelect.value);
      loginStatus.textContent = firebaseReady
        ? ""
        : (languageSelect.value === "bn" ? "Google দিয়ে প্রবেশ করা যাবে; ইমেইল প্রবেশের Firebase সেটআপ বাকি।" : "Google sign-in is available. Email sign-in still needs Firebase setup.");
      loginModal.classList.remove("hidden");
    }

    // Tool pages link back to the existing sign-in dialog through this query parameter.
    const authAction = new URLSearchParams(window.location.search).get("auth");
    if (authAction === "login" || authAction === "signup") {
      openLogin(authAction);
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    }

    document.getElementById("helpBtn").addEventListener("click", () => helpModal.classList.remove("hidden"));
    document.getElementById("settingsBtn").addEventListener("click", () => settingsModal.classList.remove("hidden"));
    document.getElementById("closeSettings").addEventListener("click", () => settingsModal.classList.add("hidden"));
    settingsModal.addEventListener("click", (event) => { if (event.target === settingsModal) settingsModal.classList.add("hidden"); });
    document.getElementById("closeHelp").addEventListener("click", () => helpModal.classList.add("hidden"));
    const helpFaqTab = document.getElementById("helpFaqTab"), helpContactTab = document.getElementById("helpContactTab");
    function selectHelpTab(tab) {
      const faq = tab === "faq";
      document.getElementById("helpFaqPanel").hidden = !faq;
      document.getElementById("helpContactPanel").hidden = faq;
      helpFaqTab.classList.toggle("active", faq); helpContactTab.classList.toggle("active", !faq);
      helpFaqTab.setAttribute("aria-selected", String(faq)); helpContactTab.setAttribute("aria-selected", String(!faq));
    }
    helpFaqTab.addEventListener("click", () => selectHelpTab("faq"));
    helpContactTab.addEventListener("click", () => selectHelpTab("contact"));

    document.getElementById("helpForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const lang = languageSelect.value === "bn" ? "bn" : "en";
      const categorySelect = document.getElementById("helpCategory");
      const category = categorySelect.options[categorySelect.selectedIndex].textContent.trim();
      const subject = document.getElementById("helpSubject").value.trim();
      const message = document.getElementById("helpMessage").value.trim();
      const emailSubject = `[Walid AI] ${subject}`;
      const body = `${lang === "bn" ? "সমস্যার ধরন" : "Issue category"}: ${category}\n\n${message}`;
      const mailto = `mailto:support@walid-ai.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(body)}`;
      document.getElementById("helpStatus").textContent = textForHelpStatus(lang);
      window.location.href = mailto;
    });
    function textForHelpStatus(lang) {
      return lang === "bn" ? "আপনার ইমেইল অ্যাপে খসড়াটি খোলা হয়েছে। পাঠাতে সেখানে Send চাপুন।" : "Your email app should open with a draft. Press Send there to send it.";
    }

    const fileInput = document.getElementById("fileInput");
    const attachBtn = document.getElementById("attachBtn");
    const attachmentList = document.getElementById("attachmentList");
    const attachMenu = document.getElementById("attachMenu");
    attachBtn.addEventListener("click", () => {
      if (!IS_ADMIN && (!firebaseAuth?.currentUser || firebaseAuth.currentUser.isAnonymous)) {
        loginModal.classList.remove("hidden");
        loginStatus.textContent = languageSelect.value === "bn" ? "ফাইল বা ছবি দিতে আগে লগ ইন করুন।" : "Log in to upload files or photos.";
        return;
      }
      const open = attachMenu.classList.contains("hidden");
      attachMenu.classList.toggle("hidden", !open);
      attachBtn.setAttribute("aria-expanded", String(open));
    });
    function openUploadPicker(kind) {
      attachMenu.classList.add("hidden");
      attachBtn.setAttribute("aria-expanded", "false");
      fileInput.accept = kind === "photo"
        ? "image/png,image/jpeg,image/webp,image/gif"
        : ".pdf,.docx,.txt,.md,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv";
      fileInput.click();
    }
    attachMenu.addEventListener("click", (event) => {
      const choice = event.target.closest("[data-upload-kind]");
      if (choice) void openUploadPicker(choice.dataset.uploadKind);
    });
    document.addEventListener("click", (event) => {
      if (!attachMenu.contains(event.target) && event.target !== attachBtn && !attachBtn.contains(event.target)) {
        attachMenu.classList.add("hidden");
        attachBtn.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        attachMenu.classList.add("hidden");
        attachBtn.setAttribute("aria-expanded", "false");
      }
    });
    fileInput.addEventListener("change", async () => {
      const files = Array.from(fileInput.files || []);
      if (files.length) {
        try {
          const headers = {};
          const token = await getAuthorizationToken();
          if (token) headers.Authorization = "Bearer " + token;
          const quotaResponse = await fetch(API + "/api/upload-quota", { headers });
          const quota = await quotaResponse.json();
          if (!quotaResponse.ok) throw new Error(quota.error || (languageSelect.value === "bn" ? "আপলোড সীমা যাচাই করা যায়নি।" : "Could not check upload quota."));
          uploadQuota = quota;
          const hint = document.getElementById("uploadQuotaHint");
          hint.textContent = quota.unlimited
            ? (languageSelect.value === "bn" ? "অ্যাডমিন অ্যাকাউন্টে আপলোড সীমা নেই" : "No upload limit for admin")
            : (languageSelect.value === "bn" ? `আজকের আপলোড: ${quota.remaining}/${quota.limit} বাকি` : `Today's uploads: ${quota.remaining}/${quota.limit} remaining`);
          if (files.length + pendingUploads.length > quota.remaining) {
            addMessage("error", languageSelect.value === "bn" ? `আজ আর মাত্র ${Math.max(0, quota.remaining - pendingUploads.length)}টি ফাইল/ছবি যোগ করা যাবে।` : `You can add ${Math.max(0, quota.remaining - pendingUploads.length)} more file(s) today.`);
            fileInput.value = "";
            return;
          }
        } catch (error) {
          addMessage("error", humanizeRequestError(error) || (languageSelect.value === "bn" ? "আপলোড সীমা যাচাই করা যায়নি।" : "Could not check upload quota."));
          fileInput.value = "";
          return;
        }
      }
      for (const file of files) {
        if (pendingUploads.length >= 5) { addMessage("error", languageSelect.value === "bn" ? "একটি বার্তায় সর্বোচ্চ ৫টি ফাইল যোগ করা যাবে।" : "You can attach up to 5 files to one message."); break; }
        if (file.size > 5 * 1024 * 1024) { addMessage("error", languageSelect.value === "bn" ? `${file.name}: ফাইলটি ৫ MB-এর বেশি।` : `${file.name}: files must be 5 MB or smaller.`); continue; }
        if (!/^(image\/(png|jpeg|webp|gif)|application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/(plain|markdown|csv))$/i.test(file.type)) { addMessage("error", languageSelect.value === "bn" ? `${file.name}: এই ফাইলের ধরন সমর্থিত নয়।` : `${file.name}: this file type is not supported.`); continue; }
        try {
          const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
          pendingUploads.push({ name: file.name, type: file.type, data: "data:" + file.type + ";base64," + String(data).split(",").pop() });
        } catch { addMessage("error", file.name + ": ফাইলটি পড়া যায়নি।"); }
      }
      fileInput.value = "";
      attachmentList.replaceChildren();
      pendingUploads.forEach((item, index) => {
        const chip = document.createElement("span"); chip.className = "attachment-chip";
        const filename = document.createElement("span"); filename.className = "attachment-chip-name"; filename.textContent = item.name; filename.title = item.name;
        const remove = document.createElement("button"); remove.type = "button"; remove.textContent = " ×"; remove.setAttribute("aria-label", item.name + (languageSelect.value === "bn" ? " সরান" : " remove"));
        remove.addEventListener("click", () => { pendingUploads.splice(index, 1); fileInput.dispatchEvent(new Event("change")); });
        chip.append(filename, remove); attachmentList.appendChild(chip);
      });
      attachmentList.classList.toggle("hidden", pendingUploads.length === 0);
    });
    document.getElementById("sidebarLoginBtn").addEventListener("click", () => openLogin("login"));

    function closeMobileSidebar() {
      sidebar.classList.remove("open");
      sidebarBackdrop.classList.remove("open");
      mobileMenu.setAttribute("aria-expanded", "false");
    }

    mobileMenu.addEventListener("click", () => {
      const opening = !sidebar.classList.contains("open");
      sidebar.classList.toggle("open", opening);
      sidebarBackdrop.classList.toggle("open", opening);
      mobileMenu.setAttribute("aria-expanded", String(opening));
    });
    sidebarBackdrop.addEventListener("click", closeMobileSidebar);
    sidebar.addEventListener("click", (event) => {
      if (event.target.closest("button, .history-item")) closeMobileSidebar();
    });
    accountAvatar.addEventListener("click", () => {
      const opening = accountPopover.classList.contains("hidden");
      accountPopover.classList.toggle("hidden", !opening);
      accountAvatar.setAttribute("aria-expanded", String(opening));
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".account-menu-wrap")) {
        accountPopover.classList.add("hidden");
        accountAvatar.setAttribute("aria-expanded", "false");
      }
    });

    function updateAccountUI(email) {
      loginModal.classList.add("hidden");
      setProfile(firebaseAuth?.currentUser?.displayName || email || "User", IS_ADMIN);
    }

    async function authorize(token, options = {}) {
      if (!API) {
        throw new Error("Walid AI এখন চালু নেই। পরে আবার চেষ্টা করুন।");
      }

      const response = await fetch(API + "/api/hello", {
        headers: { Authorization: "Bearer " + token }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "প্রবেশ করা যায়নি।");
      }

      ACCESS_TOKEN = token;
      IS_ADMIN = data.auth_role === "admin";
      if (IS_ADMIN && token.split(".").length !== 3) sessionStorage.setItem("walidAdminAccess", token);
      else sessionStorage.removeItem("walidAdminAccess");
      sessionStorage.removeItem("walidToken");

      updateAccountUI(data.email || "");

      if (IS_ADMIN && options.celebrate) showAdminCelebration();
    }

    async function getAuthorizationToken() {
      if (IS_ADMIN && ACCESS_TOKEN && ACCESS_TOKEN.split(".").length !== 3) return ACCESS_TOKEN;
      const user = firebaseAuth?.currentUser;
      if (user && !user.isAnonymous) {
        ACCESS_TOKEN = await user.getIdToken();
      }
      return ACCESS_TOKEN;
    }

    async function useFirebaseUser(user, options = {}) {
      const adminSessionToken = sessionStorage.getItem("walidAdminAccess") || "";
      if (adminSessionToken && adminSessionToken.split(".").length !== 3) return;
      if (
        !user ||
        user.isAnonymous ||
        !user.email ||
        authorizedUid === user.uid ||
        authorizingUid === user.uid
      ) {
        return;
      }

      authorizingUid = user.uid;
      historyOwner = user.uid;
      chat.replaceChildren();
      chatMessages = [];
      restoreWelcome();

      try {
        await authorize(await user.getIdToken(), options);
        setProfile(user.displayName || user.email, IS_ADMIN);
        const records = (await loadAccountRecords(false))
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        drawHistory(records);
        const savedId = localStorage.getItem(accountChatKey(user.uid));
        const active = records.find((record) => record.id === savedId) || (!savedId ? records[0] : null);
        if (active) {
          openConversation(active);
        } else {
          currentConversationId = savedId || newConversationId();
          localStorage.setItem(accountChatKey(user.uid), currentConversationId);
          chat.replaceChildren();
          chatMessages = [];
          restoreWelcome();
        }
        authorizedUid = user.uid;
      } catch (error) {
        historyOwner = "";
        loginStatus.textContent = error.message || "প্রবেশ করা যায়নি।";
      } finally {
        authorizingUid = "";
      }
    }

    // Firebase initialization
    if (firebaseReady && window.firebase) {
      try {
        firebase.initializeApp(firebaseConfig);
        firebaseAuth = firebase.auth();
        firestoreDB = firebase.firestore();
        // Firebase Auth's default browser persistence is LOCAL unless changed in Firebase setup.
        emailButton.disabled = false;

        let initialAuthStateHandled = false;
        firebaseAuth.onAuthStateChanged((user) => {
          const isFreshLogin = initialAuthStateHandled;
          initialAuthStateHandled = true;
          if (user && !user.isAnonymous) {
            useFirebaseUser(user, { celebrate: isFreshLogin });
          }
        });

        if (firebaseAuth.isSignInWithEmailLink(window.location.href)) {
          const email = localStorage.getItem("walidEmailForSignIn");

          if (email) {
            firebaseAuth.signInWithEmailLink(email, window.location.href)
              .then(async (result) => {
                localStorage.removeItem("walidEmailForSignIn");
                history.replaceState(
                  {},
                  document.title,
                  window.location.pathname
                );
                await useFirebaseUser(result.user);
              })
              .catch((error) => {
                openLogin();
                loginStatus.textContent =
                  error.message || "ইমেইল লিংকটি ব্যবহার করা যায়নি।";
              });
          } else {
            openLogin();
            loginStatus.textContent =
              "যে ডিভাইসে ইমেইল লিংক চেয়েছিলে, সেখানেই লিংকটি খোলো।";
          }
        }
      } catch (error) {
        emailButton.disabled = true;
        loginStatus.textContent = "ইমেইল প্রবেশ সেটআপ করা যায়নি।";
      }
    } else {
      emailButton.disabled = true;
      loginStatus.textContent =
        "ইমেইল প্রবেশ চালু করতে Firebase সেটআপ বাকি।";
    }

    loginBtn.addEventListener("click", () => openLogin("login"));
    signupBtn.addEventListener("click", () => openLogin("signup"));
    chatToolsBtn.addEventListener("click", () => {
      if (!IS_ADMIN && (!firebaseAuth?.currentUser || firebaseAuth.currentUser.isAnonymous)) {
        openLogin("login");
        return;
      }
      chatToolsModal.classList.remove("hidden");
    });
    window.addEventListener("message", async (event) => {
      if (event.origin !== window.location.origin || event.source !== chatToolsModal.querySelector("iframe")?.contentWindow) return;
      if (event.data?.type !== "walid-tools-token-request" || typeof event.data.id !== "string") return;
      try {
        const token = await getAuthorizationToken();
        event.source.postMessage({ type: "walid-tools-token", id: event.data.id, token: token || "" }, event.origin);
      } catch {
        event.source.postMessage({ type: "walid-tools-token", id: event.data.id, token: "" }, event.origin);
      }
    });
    document.getElementById("closeChatTools").addEventListener("click", () => chatToolsModal.classList.add("hidden"));
    chatToolsModal.addEventListener("click", (event) => {
      if (event.target === chatToolsModal) chatToolsModal.classList.add("hidden");
    });

    document.getElementById("closeLogin").addEventListener("click", () => {
      loginModal.classList.add("hidden");
    });

    loginModal.addEventListener("click", (event) => {
      if (event.target === loginModal) {
        loginModal.classList.add("hidden");
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        loginModal.classList.add("hidden");
      }
    });

    // Email login
    emailButton.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      loginStatus.textContent = "";

      if (!firebaseAuth) {
        loginStatus.textContent =
          "ইমেইল প্রবেশ চালু করতে Firebase সেটআপ বাকি।";
        return;
      }

      if (!email) {
        loginStatus.textContent = "তোমার ইমেইল ঠিকানা লিখো।";
        emailInput.focus();
        return;
      }

      emailButton.disabled = true;
      emailButton.textContent = "Sending link…";

      try {
        await firebaseAuth.sendSignInLinkToEmail(email, {
          url: window.location.origin + window.location.pathname,
          handleCodeInApp: true
        });

        localStorage.setItem("walidEmailForSignIn", email);
        loginStatus.textContent =
          "ইমেইলে প্রবেশের লিংক পাঠানো হয়েছে। এই ডিভাইসে লিংকটি খোলো।";
      } catch (error) {
        loginStatus.textContent = error.message || "লিংক পাঠানো যায়নি।";
      } finally {
        emailButton.disabled = false;
        emailButton.textContent = "Continue with email";
      }
    });

    // Google login
    const googleClientId =
      String(window.WALID_AI_GOOGLE_CLIENT_ID || "").trim();

    if (firebaseAuth && googleClientId) {
      const googleCta = document.createElement("button");
      googleCta.type = "button";
      googleCta.className = "google-custom";
      googleCta.textContent = "Continue with Google";

      googleCta.addEventListener("click", async () => {
        loginStatus.textContent = "";

        try {
          const provider = new firebase.auth.GoogleAuthProvider();
          await firebaseAuth.signInWithPopup(provider);
        } catch (error) {
          loginStatus.textContent =
            error.message || "Google দিয়ে প্রবেশ করা যায়নি।";
        }
      });

      googleButton.appendChild(googleCta);
    } else if (
      googleClientId &&
      window.google &&
      window.google.accounts &&
      window.google.accounts.id
    ) {
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          loginStatus.textContent = "";

          try {
            if (firebaseAuth) {
              const credential =
                firebase.auth.GoogleAuthProvider.credential(
                  response.credential
                );
              const result =
                await firebaseAuth.signInWithCredential(credential);
              await useFirebaseUser(result.user);
            } else {
              await authorize(response.credential);
            }
          } catch (error) {
            loginStatus.textContent =
              error.message || "Google দিয়ে প্রবেশ করা যায়নি।";
          }
        },
        auto_select: false
      });

      google.accounts.id.renderButton(googleButton, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 320,
        locale: "en"
      });
    } else {
      googleButton.textContent = "Google sign-in setup required";
    }

    // Logout
    logoutBtn.addEventListener("click", async () => {
      if (firebaseAuth && firebaseAuth.currentUser) {
        await firebaseAuth.signOut().catch(() => {});
      }

      ACCESS_TOKEN = "";
      IS_ADMIN = false;
      authorizedUid = "";
      authorizingUid = "";
      historyOwner = "";

      sessionStorage.removeItem("walidToken");
      
      sessionStorage.removeItem("walidAdminAccess");
      sessionStorage.removeItem("walidActiveChatId");

      accountPopover.classList.add("hidden");
      accountAvatar.setAttribute("aria-expanded", "false");
      accountMenuWrap.classList.add("hidden");
      loginBtn.classList.remove("hidden");
      signupBtn.classList.remove("hidden");

      sessionStorage.removeItem("walidGuestChats");
      chat.replaceChildren();
      chatMessages = [];
      restoreWelcome();
      currentConversationId = newConversationId();
      rememberActiveConversation();
      setProfile("Guest");
      drawHistory(guestRecords());
    });

    // Render chat messages safely as text
    function addMessage(kind, text, source = "", meta = {}) {
      const bubble = document.createElement("div");
      bubble.className = "msg " + kind;
      if (/[\u0980-\u09FF]/.test(String(text ?? ""))) bubble.classList.add("bengali");

      const table = kind === "ai" ? parseMarkdownTable(text) : null;

      if (table) {
        const wrapper = document.createElement("div");
        wrapper.className = "answer-table-wrap";

        const element = document.createElement("table");
        element.className = "answer-table";

        const head = document.createElement("thead");
        const row = document.createElement("tr");

        table.headers.forEach((value) => {
          const cell = document.createElement("th");
          cell.textContent = value;
          row.appendChild(cell);
        });

        head.appendChild(row);
        element.appendChild(head);

        const body = document.createElement("tbody");

        table.rows.forEach((values) => {
          const tr = document.createElement("tr");

          values.forEach((value) => {
            const td = document.createElement("td");
            td.textContent = value;
            tr.appendChild(td);
          });

          body.appendChild(tr);
        });

        element.appendChild(body);
        wrapper.appendChild(element);
        bubble.appendChild(wrapper);
      } else {
        const body = document.createElement("span");
        body.textContent = String(text ?? "");
        if (kind === "ai" && !table) renderAnswerContent(body, String(text ?? ""));
        bubble.appendChild(body);
      }

      if (source) {
        const label = document.createElement("span");
        label.className = "source";
        label.textContent = source;
        bubble.appendChild(label);
      }

      chat.appendChild(bubble);
      chat.scrollTo({ top: chat.scrollHeight, behavior: restoringChat ? "auto" : "smooth" });
      if (["user", "ai"].includes(kind) && !restoringChat) dismissWelcome();

      if (!restoringChat && ["user", "ai"].includes(kind)) {
        chatMessages.push({ kind, text: String(text ?? ""), source });
        void persistConversation();
      }
      if (["user", "ai"].includes(kind)) bubble.dataset.messageIndex = String(chat.querySelectorAll(".msg.user, .msg.ai").length - 1);

      if (kind === "user") {
        const actions = document.createElement("div"); actions.className = "question-actions";
        const edit = document.createElement("button"); edit.type = "button"; edit.title = languageSelect.value === "bn" ? "প্রশ্ন সম্পাদনা করুন" : "Edit question"; edit.setAttribute("aria-label", edit.title); edit.innerHTML = '<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>';
        edit.addEventListener("click", () => {
          const index = Number(bubble.dataset.messageIndex);
          input.value = String(text ?? ""); resizeComposer(); input.focus();
          chatMessages = chatMessages.slice(0, index);
          const previous = chatMessages.slice(); chat.replaceChildren();
          restoringChat = true; previous.forEach((item) => addMessage(item.kind, item.text, item.source || "")); restoringChat = false;
          void persistConversation();
        });
        const copy = document.createElement("button"); copy.type = "button"; copy.title = languageSelect.value === "bn" ? "প্রশ্ন কপি করুন" : "Copy question"; copy.setAttribute("aria-label", copy.title); copy.innerHTML = '<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/></svg>';
        copy.addEventListener("click", async (event) => { event.stopPropagation(); try { await navigator.clipboard.writeText(String(text ?? "")); } catch { addMessage("error", languageSelect.value === "bn" ? "প্রশ্নটি কপি করা যায়নি।" : "The question could not be copied."); } bubble.classList.remove("question-menu-open"); });
        actions.append(edit, copy); bubble.appendChild(actions);
        let holdTimer = null;
        const reveal = () => { chat.querySelectorAll(".question-menu-open").forEach((item) => item.classList.remove("question-menu-open")); bubble.classList.add("question-menu-open"); };
        bubble.addEventListener("contextmenu", (event) => { event.preventDefault(); reveal(); });
        bubble.addEventListener("pointerdown", (event) => { if (event.button !== 0) return; holdTimer = setTimeout(reveal, 500); });
        ["pointerup", "pointerleave", "pointercancel"].forEach((name) => bubble.addEventListener(name, () => { clearTimeout(holdTimer); }));
        bubble.addEventListener("click", (event) => { if (!event.target.closest(".question-actions")) chat.querySelectorAll(".question-menu-open").forEach((item) => item.classList.remove("question-menu-open")); });
      }
      if (kind === "ai") {
        const answerIndex = Number(bubble.dataset.messageIndex);
        const previousQuestion = meta.question || [...chatMessages.slice(0, answerIndex)].reverse().find((item) => item.kind === "user")?.text || "";
        const actions = document.createElement("div"); actions.className = "answer-actions";
        const iconButton = (svg, title, callback) => { const element = document.createElement("button"); element.type = "button"; element.innerHTML = svg; element.title = title; element.setAttribute("aria-label", title); element.addEventListener("click", callback); actions.appendChild(element); };
        iconButton('<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/></svg>', languageSelect.value === "bn" ? "উত্তর কপি করুন" : "Copy answer", async () => { try { await navigator.clipboard.writeText(String(text ?? "")); } catch { addMessage("error", languageSelect.value === "bn" ? "কপি করা যায়নি—উত্তরটি চেপে ধরে কপি করুন।" : "Copy failed. Press and hold the answer to copy it."); } });
        iconButton('<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4"/></svg>', languageSelect.value === "bn" ? "উত্তর শেয়ার করুন" : "Share answer", async () => { try { if (navigator.share) await navigator.share({ title:"Walid AI", text:String(text ?? "") }); else { await navigator.clipboard.writeText(String(text ?? "")); } } catch {} });
        iconButton('<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5"/><path d="M20 12a8 8 0 1 0 2 5"/></svg>', languageSelect.value === "bn" ? "আবার উত্তর তৈরি করুন" : "Regenerate answer", () => { input.value = String(previousQuestion); resizeComposer(); form.requestSubmit(); });
        const liked = new Set(JSON.parse(localStorage.getItem("walidLikedAnswers") || "[]"));
        const like = document.createElement("button"); like.type = "button"; like.title = languageSelect.value === "bn" ? "ভালো লেগেছে" : "Like answer"; like.setAttribute("aria-label", like.title); like.innerHTML = '<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>'; like.classList.toggle("active", liked.has(String(text ?? "")));
        like.addEventListener("click", () => { const next = new Set(JSON.parse(localStorage.getItem("walidLikedAnswers") || "[]")); if (next.has(String(text ?? ""))) next.delete(String(text ?? "")); else next.add(String(text ?? "")); localStorage.setItem("walidLikedAnswers", JSON.stringify([...next].slice(-100))); like.classList.toggle("active", next.has(String(text ?? ""))); });
        actions.appendChild(like);
        if (Number.isFinite(meta.seconds)) { const duration = document.createElement("span"); duration.className = "source"; duration.textContent = languageSelect.value === "bn" ? `⏱ ${meta.seconds.toFixed(1)} সেকেন্ড` : `⏱ ${meta.seconds.toFixed(1)} sec`; actions.appendChild(duration); }
        bubble.appendChild(actions);
      }

      return bubble;
    }

    function parseMarkdownTable(text) {
      const lines = String(text).trim()
        .split(/\r?\n/)
        .filter((line) => line.includes("|"));

      if (
        lines.length < 3 ||
        !/^\s*\|?\s*:?-{3,}/.test(lines[1])
      ) {
        return null;
      }

      const parseRow = (line) => line.trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim().replace(/\\\|/g, "|"));

      return {
        headers: parseRow(lines[0]),
        rows: lines.slice(2).map(parseRow)
      };
    }

    function renderAnswerContent(node, text) {
      const pattern = /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g;
      const fragment = document.createDocumentFragment();
      let last = 0, match;
      while ((match = pattern.exec(text))) {
        fragment.appendChild(document.createTextNode(text.slice(last, match.index)));
        const link = document.createElement("a"); link.textContent = match[1]; link.href = match[2]; link.target = "_blank"; link.rel = "noopener noreferrer";
        fragment.appendChild(link); last = pattern.lastIndex;
      }
      fragment.appendChild(document.createTextNode(text.slice(last)));
      node.replaceChildren(fragment);
    }

    // Admin feedback
    async function saveFeedback(question, answer, box, button) {
      button.disabled = true;

      try {
        const authToken = await getAuthorizationToken();
        const response = await fetch(API + "/api/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + authToken
          },
          body: JSON.stringify({ question, answer })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "সংশোধন সেভ করা যায়নি।");
        }

        box.replaceChildren();

        const status = document.createElement("span");
        status.className = "feedback-status";
        status.textContent = data.message || "সেভ হয়েছে।";
        box.appendChild(status);
      } catch (error) {
        button.disabled = false;

        const status = document.createElement("span");
        status.className = "feedback-status";
        status.textContent = error.message;
        box.appendChild(status);
      }
    }

    function addFeedback(bubble, question, answer) {
      if (!IS_ADMIN) return;

      const box = document.createElement("div");
      box.className = "feedback";

      const correct = document.createElement("button");
      correct.type = "button";
      correct.textContent = "উত্তর ঠিক";
      correct.addEventListener("click", () => {
        saveFeedback(question, answer, box, correct);
      });

      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "সংশোধন দিন";

      edit.addEventListener("click", () => {
        if (box.querySelector("textarea")) return;

        const field = document.createElement("textarea");
        field.placeholder = "সঠিক উত্তরটি লিখুন…";

        const save = document.createElement("button");
        save.type = "button";
        save.textContent = "সেভ করুন";

        save.addEventListener("click", () => {
          if (field.value.trim()) {
            saveFeedback(question, field.value.trim(), box, save);
          }
        });

        box.append(field, save);
        field.focus();
      });

      box.append(correct, edit);
      bubble.appendChild(box);
    }

    function sourceLabel(mode) {
      const bn = languageSelect.value === "bn";
      if (mode === "dataset_lookup") return "";
      if (mode === "uploaded_file") return bn ? "আপনার ফাইল থেকে" : "From your file";
      if (mode === "pdf_passages") return bn ? "PDF থেকে" : "From PDF";
      if (mode === "pdf_table") return bn ? "PDF-এর টেবিল থেকে" : "From a PDF table";
      if (mode === "web") return bn ? "ওয়েব উৎস থেকে" : "From web sources";
      if (mode === "not_found") return bn ? "তথ্যভাণ্ডারে মেলেনি" : "Not found in the knowledge base";

      if (mode === "setup_required" || mode === "ocr_setup_required") {
        return bn ? "সেটআপ প্রয়োজন" : "Setup required";
      }

      if (mode === "ocr_no_text_found") {
        return bn ? "PDF-এ পড়ার মতো লেখা পাওয়া যায়নি" : "No readable text was found in the PDF";
      }

      if (
        mode === "personal_memory_saved" ||
        mode === "personal_memory"
      ) {
        return bn ? "ব্যক্তিগত স্মৃতি" : "Personal memory";
      }

      return "";
    }

    let chatSending = false;
    let backendReady = false;

    function humanizeRequestError(error) {
      const bn = languageSelect.value === "bn";
      const raw = String(error && error.message || "");
      const status = Number(error && error.status || 0);
      if (error && error.quota === "daily_limit") return raw;
      if (/failed to fetch|failed to patch|networkerror|load failed|network request failed/i.test(raw) || status === 502 || status === 503 || status === 504 || error && error.name === "AbortError") {
        return bn
          ? "সংযোগ হয়নি। বিনামূল্যের সার্ভার ঘুম থেকে উঠতে এক মিনিট লাগতে পারে। একটু পরে আবার পাঠান।"
          : "Could not reach Walid AI. The free server can take about a minute to wake up. Please send the question again shortly.";
      }
      if (status === 429 || (error && error.quota === "rate")) {
        return raw || (bn ? "একসাথে অনেক প্রশ্ন চলে গেছে। এক মিনিট পর আবার চেষ্টা করুন।" : "Too many questions at once. Please wait a minute and try again.");
      }
      if (/unexpected end of json|json/i.test(raw)) {
        return bn ? "সার্ভার উত্তর দিতে পারেনি। একটু পরে আবার চেষ্টা করুন।" : "The server could not return an answer. Please try again shortly.";
      }
      if (raw && raw.length < 400) return raw;
      return bn ? "উত্তর পাওয়া যায়নি। আবার চেষ্টা করুন।" : "No answer came back. Please try again.";
    }

    function fetchWithTimeout(url, options, timeoutMs) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      return fetch(url, Object.assign({}, options, { signal: controller.signal, cache: "no-store" }))
        .finally(() => clearTimeout(timer));
    }

    async function wakeBackend(maxMs) {
      const started = performance.now();
      while (performance.now() - started < maxMs) {
        try {
          const response = await fetchWithTimeout(API + "/health", { method: "GET" }, 20000);
          if (response.ok) {
            backendReady = true;
            return true;
          }
        } catch (error) {
          backendReady = false;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      return false;
    }

    function trimChatHistory(messages) {
      const recent = messages.filter((item) => item.kind === "user" || item.kind === "ai").slice(-8);
      let budget = 4000;
      const kept = [];
      for (let index = recent.length - 1; index >= 0 && budget > 0; index -= 1) {
        let text = String(recent[index].text || "").replace(/\s+/g, " ").trim().slice(0, 800);
        if (!text) continue;
        text = text.slice(0, budget);
        budget -= text.length;
        kept.push({ role: recent[index].kind === "ai" ? "assistant" : "user", text });
      }
      return kept.reverse();
    }

    function thinkingText(seconds, waking) {
      const bn = languageSelect.value === "bn";
      const clock = seconds.toFixed(1);
      if (waking) {
        return bn ? `সার্ভার ঘুম থেকে উঠছে… ${clock} সেকেন্ড` : `Server is waking up… ${clock}s`;
      }
      return bn ? `উত্তর তৈরি হচ্ছে… ${clock} সেকেন্ড` : `Preparing an answer… ${clock}s`;
    }

    // Chat submit
    function detectPdfChatTool(question, files) {
      if (!files.length || files.some((file) => file.type !== "application/pdf")) return "";
      const text = String(question || "").toLocaleLowerCase();
      if (/(pdf\s*(?:to|into|→)\s*word|word\s*(?:from|for)\s*pdf|pdf\s*থেকে\s*(?:word|ওয়ার্ড|ওয়ার্ড)|পিডিএফ\s*থেকে\s*(?:word|ওয়ার্ড|ওয়ার্ড))/i.test(text)) return "pdf-to-word";
      if (/(merge|combine|join|মার্জ|একত্র|একসাথে|জোড়া|জোড়া)/i.test(text)) return "merge-pdf";
      if (/(split|extract pages|separate pages|ভাগ|আলাদা পৃষ্ঠা|পৃষ্ঠা আলাদা)/i.test(text)) return "split-pdf";
      if (/(compress|shrink|reduce.*size|file size|কমপ্রেস|সাইজ কম|ছোট করে)/i.test(text)) return "compress-pdf";
      return "";
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const question = input.value.trim();
      if (!question || chatSending) return;

      if (!API) {
        addMessage("error", languageSelect.value === "bn" ? "Walid AI API সেটআপ পাওয়া যায়নি।" : "Walid AI API is not configured.");
        return;
      }

      if (pendingUploads.length && !IS_ADMIN && (!firebaseAuth?.currentUser || firebaseAuth.currentUser.isAnonymous)) {
        loginModal.classList.remove("hidden"); loginStatus.textContent = languageSelect.value === "bn" ? "ফাইল পাঠাতে আগে লগ ইন করুন।" : "Log in before sending files."; return;
      }
      if (pendingUploads.length && uploadQuota && !uploadQuota.unlimited && pendingUploads.length > uploadQuota.remaining) { addMessage("error", languageSelect.value === "bn" ? `আজ আর মাত্র ${uploadQuota.remaining}টি ফাইল/ছবি পাঠানো যাবে।` : `You can send ${uploadQuota.remaining} more file(s) today.`); return; }
      chatSending = true;
      send.disabled = true;
      const priorHistory = trimChatHistory(chatMessages);
      addMessage("user", question);
      const filesToSend = pendingUploads.slice();
      input.value = "";
      pendingUploads = []; attachmentList.replaceChildren(); attachmentList.classList.add("hidden");
      resizeComposer();
      const requestStarted = performance.now();
      const requestId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2));
      let streamedBubble = null, streamedBody = null, streamedText = "", streamVisible = 0, streamTicker = null;
      let attempt = 0;
      const thinking = addMessage("thinking", thinkingText(0, !backendReady));
      const timer = setInterval(() => {
        const seconds = (performance.now() - requestStarted) / 1000;
        thinking.textContent = thinkingText(seconds, !backendReady || seconds >= 8 || attempt > 1);
      }, 100);

      const headers = { "Content-Type": "application/json" };

      try {
        const authToken = await getAuthorizationToken();
        if (authToken) {
          headers.Authorization = "Bearer " + authToken;
        }

        const pdfTool = detectPdfChatTool(question, filesToSend);
        if (pdfTool) {
          const encoded = filesToSend.map((file) => String(file.data || "").split(",")[1] || "");
          const toolBody = pdfTool === "merge-pdf"
            ? { files: encoded }
            : pdfTool === "split-pdf"
              ? { file: encoded[0], pages: question.match(/(?:pages?|পৃষ্ঠা)\s*[:=]?\s*([0-9,\-\s]+)/i)?.[1]?.replace(/\s/g, "") || "" }
              : { file: encoded[0] };
          const toolResponse = await fetch(API + "/api/chat-tool/" + pdfTool, {
            method: "POST", headers,
            body: JSON.stringify(toolBody)
          });
          const toolResult = await toolResponse.json();
          if (!toolResponse.ok) {
            const error = new Error(toolResult.error || "The PDF could not be processed.");
            error.quota = toolResult.quota || "";
            throw error;
          }
          const fileBytes = Uint8Array.from(atob(toolResult.file), (character) => character.charCodeAt(0));
          const downloadUrl = URL.createObjectURL(new Blob([fileBytes], { type: toolResult.type }));
          const toolAnswer = addMessage("ai", "Your file is ready.", "File tool", { question });
          const download = document.createElement("a");
          download.className = "tool-result-link";
          download.href = downloadUrl;
          download.download = String(toolResult.name || "file").startsWith("Walid AI_") ? toolResult.name : `Walid AI_${toolResult.name || "file"}`;
          download.textContent = `Download ${download.download}`;
          download.textContent = "Download " + download.download;
          toolAnswer.insertBefore(download, toolAnswer.querySelector(".answer-actions"));
          if (uploadQuota && !uploadQuota.unlimited) {
            uploadQuota.used += filesToSend.length;
            uploadQuota.remaining = Math.max(0, uploadQuota.remaining - filesToSend.length);
            document.getElementById("uploadQuotaHint").textContent = "Today's uploads: " + uploadQuota.remaining + "/" + uploadQuota.limit + " remaining";
          }
          clearInterval(timer); thinking.remove();
          return;
        }

        const payload = JSON.stringify({
          question,
          guest_id: getGuestClientId(),
          files: filesToSend,
          history: priorHistory,
          language: languageSelect.value === "bn" ? "bn" : "en",
          request_id: requestId
        });
        let response = null;
        let data = null;
        let chatError = null;
        while (attempt < 2 && !data) {
          attempt += 1;
          try {
            response = await fetchWithTimeout(API + "/api/chat", { method: "POST", headers, body: payload }, 90000);
            const contentType = response.headers.get("Content-Type") || "";
            if (!response.ok || !contentType.includes("application/x-ndjson")) {
              const raw = await response.text();
              let parsed = {};
              try { parsed = raw ? JSON.parse(raw) : {}; } catch { parsed = {}; }
              if (!response.ok) {
                chatError = new Error(parsed.error || "");
                chatError.status = response.status;
                chatError.quota = parsed.quota || "";
                chatError.retryable = Boolean(parsed.retryable);
                const retryable = chatError.quota !== "daily_limit" && (chatError.retryable || response.status === 502 || response.status === 503 || response.status === 504 || response.status === 429);
                if (retryable && attempt < 2) {
                  thinking.textContent = thinkingText((performance.now() - requestStarted) / 1000, true);
                  await wakeBackend(response.status === 429 ? 5000 : 60000);
                  continue;
                }
                throw chatError;
              }
              data = parsed;
              break;
            }
            break;
          } catch (error) {
            chatError = error;
            const network = error.name === "AbortError" || /failed to fetch|networkerror|load failed/i.test(String(error.message || ""));
            if (network && attempt < 2) {
              thinking.textContent = thinkingText((performance.now() - requestStarted) / 1000, true);
              await wakeBackend(60000);
              continue;
            }
            throw error;
          }
        }

        if ((response.headers.get("Content-Type") || "").includes("application/x-ndjson") && response.body && !data) {
          data = {};
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (true) {
            const { value, done } = await reader.read();
            buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
            const lines = buffer.split("\n"); buffer = lines.pop() || "";
            for (const line of lines) {
              if (!line.trim()) continue;
              const event = JSON.parse(line);
              if (event.event === "delta") {
                if (!streamedBubble) {
                  const elapsed = (performance.now() - requestStarted) / 1000;
                  clearInterval(timer); thinking.remove();
                  streamedBubble = addMessage("ai", "", "", { question, seconds: elapsed });
                  streamedBody = streamedBubble.querySelector(":scope > span:not(.source)");
                  streamedBody.classList.add("typing-cursor");
                  streamTicker = setInterval(() => {
                    if (streamVisible < streamedText.length) {
                      streamVisible = Math.min(streamedText.length, streamVisible + Math.max(1, Math.ceil((streamedText.length - streamVisible) / 90)));
                      streamedBody.textContent = streamedText.slice(0, streamVisible);
                      chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
                    }
                  }, 18);
                }
                streamedText += event.text || "";
              } else if (event.event === "done") {
                Object.assign(data, event);
              }
            }
            if (done) break;
          }
          while (streamVisible < streamedText.length) await new Promise((resolve) => setTimeout(resolve, 24));
          if (streamTicker) clearInterval(streamTicker);
          if (streamedBody) { streamedBody.classList.remove("typing-cursor"); renderAnswerContent(streamedBody, streamedText); }
          data.answer = streamedText || data.answer || "";
        }

        if (!data || !data.answer) {
          const empty = new Error("");
          empty.status = response ? response.status : 502;
          throw empty;
        }

        const seconds = (performance.now() - requestStarted) / 1000;
        if (uploadQuota && filesToSend.length && !uploadQuota.unlimited) {
          uploadQuota.used += filesToSend.length; uploadQuota.remaining = Math.max(0, uploadQuota.remaining - filesToSend.length);
          document.getElementById("uploadQuotaHint").textContent = "আজকের আপলোড: " + uploadQuota.remaining + "/" + uploadQuota.limit + " বাকি";
        }
        clearInterval(timer); thinking.remove();
        const answer = streamedBubble || addMessage("ai", data.answer, sourceLabel(data.answering_mode), { question, seconds });
        if (streamedBubble) {
          const label = sourceLabel(data.answering_mode);
          if (label) { const source = document.createElement("span"); source.className = "source"; source.textContent = label; answer.insertBefore(source, answer.querySelector(".answer-actions")); }
        }
        const savedAnswer = chatMessages.at(-1); if (savedAnswer?.kind === "ai") { savedAnswer.text = data.answer; void persistConversation(); }
        const bodyNode = answer.querySelector(":scope > span:not(.source)");
        if (!streamedBubble && bodyNode && data.answer.length < 12000) {
          bodyNode.textContent = "";
          bodyNode.classList.add("typing-cursor");
          const target = String(data.answer); let offset = 0; const step = Math.max(1, Math.ceil(target.length / 160));
          const typeNext = () => { offset = Math.min(target.length, offset + step); bodyNode.textContent = target.slice(0, offset); if (offset < target.length) { chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" }); setTimeout(typeNext, 12); } else { bodyNode.classList.remove("typing-cursor"); renderAnswerContent(bodyNode, target); } };
          typeNext();
        }

        addFeedback(answer, question, data.answer);

        // Show experimental model output in the UI only for admin.
        if (IS_ADMIN && data.model_answer) {
          const draft = addMessage(
            "ai",
            data.model_answer,
            data.model_note || "নিজস্ব মডেলের পরীক্ষামূলক উত্তর"
          );

          addFeedback(draft, question, data.model_answer);
        }
      } catch (error) {
        clearInterval(timer); if (thinking) thinking.remove();
        if (streamTicker) clearInterval(streamTicker);
        addMessage("error", humanizeRequestError(error));
      } finally {
        chatSending = false;
        send.disabled = false;
        input.focus();
      }
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    function resizeComposer() {
      input.style.height = "42px";
      const nextHeight = Math.min(input.scrollHeight, 140);
      input.style.height = nextHeight + "px";
      input.style.overflowY = input.scrollHeight > 140 ? "auto" : "hidden";
    }

    input.addEventListener("input", resizeComposer);

    document.getElementById("newChat").addEventListener("click", () => {
      currentConversationId = newConversationId();
      rememberActiveConversation();
      chatMessages = [];
      chat.replaceChildren();
      restoreWelcome();
      input.focus();
    });

    if (API) void wakeBackend(70000);

    // Restore admin access-code session. Firebase users are restored through
    // onAuthStateChanged and receive a fresh ID token there.
    if (ACCESS_TOKEN) {
      authorize(ACCESS_TOKEN).then(() => {
        restoreGuestConversation();
      }).catch(() => {
        ACCESS_TOKEN = "";
        IS_ADMIN = false;
        authorizedUid = "";
        historyOwner = "";

        sessionStorage.removeItem("walidToken");
        
        sessionStorage.removeItem("walidAdminAccess");
        loginBtn.classList.remove("hidden");
        signupBtn.classList.remove("hidden");
        accountMenuWrap.classList.add("hidden");
        setProfile("Guest");
      });
    }
  

