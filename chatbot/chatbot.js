(function () {
  "use strict";

  var apiEndpoint = window.PORTFOLIO_CHAT_API_URL || (window.location.origin + "/api/chat");

  var toggleButton = document.getElementById("chatbot-toggle");
  var panel = document.getElementById("chatbot-panel");
  var closeButton = document.getElementById("chatbot-close");
  var nudge = document.getElementById("chatbot-nudge");
  var messages = document.getElementById("chatbot-messages");
  var starters = document.getElementById("chatbot-starters");
  var form = document.getElementById("chatbot-form");
  var input = document.getElementById("chatbot-input");
  var sendButton = document.getElementById("chatbot-send");

  if (!toggleButton || !panel || !messages || !form || !input || !sendButton) {
    return;
  }

  var history = [];
  var isOpen = false;
  var isSending = false;
  var nudgeTimer = null;
  var closeTimer = null;
  var PANEL_ANIMATION_MS = 220;

  function setNudgeVisible(visible) {
    if (!nudge) return;
    nudge.classList.toggle("is-visible", visible);
  }

  function dismissNudge() {
    if (nudgeTimer) {
      clearTimeout(nudgeTimer);
      nudgeTimer = null;
    }
    setNudgeVisible(false);
  }

  function setPanelOpen(open) {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }

    isOpen = open;
    toggleButton.setAttribute("aria-expanded", String(open));
    if (open) {
      panel.hidden = false;
      panel.classList.remove("is-closing");
      requestAnimationFrame(function () {
        panel.classList.add("is-open");
      });
      dismissNudge();
      input.focus();
      scrollToBottom();
      return;
    }

    panel.classList.remove("is-open");
    panel.classList.add("is-closing");
    closeTimer = setTimeout(function () {
      panel.hidden = true;
      panel.classList.remove("is-closing");
    }, PANEL_ANIMATION_MS);
  }

  function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  function autoresize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  }

  function createMessageNode(role, text, citations) {
    var wrapper = document.createElement("article");
    wrapper.className = "chatbot-message " + role;
    wrapper.textContent = text;

    if (role === "assistant" && Array.isArray(citations) && citations.length > 0) {
      var citationsWrap = document.createElement("div");
      citationsWrap.className = "chatbot-citations";

      citations.slice(0, 4).forEach(function (citation) {
        var a = document.createElement("a");
        a.textContent = citation.title || "Source";
        a.href = citation.url || "#";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        citationsWrap.appendChild(a);
      });

      wrapper.appendChild(citationsWrap);
    }

    return wrapper;
  }

  function addThinkingSkeleton() {
    var wrapper = document.createElement("article");
    wrapper.className = "chatbot-message assistant chatbot-message-skeleton";
    wrapper.innerHTML =
      '<span class="chatbot-skeleton-line"></span>' +
      '<span class="chatbot-skeleton-line short"></span>' +
      '<span class="chatbot-skeleton-line medium"></span>';
    messages.appendChild(wrapper);
    scrollToBottom();
    return wrapper;
  }

  function addMessage(role, text, citations) {
    var node = createMessageNode(role, text, citations);
    messages.appendChild(node);
    scrollToBottom();
    return node;
  }

  function setSendingState(sending) {
    isSending = sending;
    sendButton.disabled = sending;
    sendButton.textContent = sending ? "Sending..." : "Send";
    input.disabled = sending;
  }

  function starterWelcome() {
    addMessage(
      "assistant",
      "Hi, I am Suhaas' portfolio assistant. Ask me about projects, tech stack, education, certifications, or systems design strengths."
    );
  }

  async function queryAssistant(userText) {
    var response;
    try {
      response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userText,
          history: history
        })
      });
    } catch (networkError) {
      throw new Error(
        "Could not connect to chat API. If this site is static-hosted, deploy the backend and set window.PORTFOLIO_CHAT_API_URL."
      );
    }

    var payload = {};
    try {
      payload = await response.json();
    } catch (error) {
      payload = {};
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          "Chat API endpoint not found (404). Deploy /api/chat and set window.PORTFOLIO_CHAT_API_URL to your backend URL."
        );
      }
      if (response.status === 500 && payload.error === "Server is missing GROQ_API_KEY.") {
        throw new Error("Backend is live, but GROQ_API_KEY is missing in server environment variables.");
      }
      throw new Error(payload.error || "Unable to reach the assistant service.");
    }

    return payload;
  }

  async function sendMessage(rawText) {
    var text = String(rawText || "").trim();
    if (!text || isSending) return;

    addMessage("user", text);
    setSendingState(true);

    var typing = addThinkingSkeleton();
    starters.hidden = true;

    try {
      var payload = await queryAssistant(text);
      typing.remove();

      var answer =
        payload.answer ||
        "I could not generate an answer right now. Please try a different question.";
      addMessage("assistant", answer, payload.citations || []);

      history.push({ role: "user", content: text });
      history.push({ role: "assistant", content: answer });
      history = history.slice(-8);
    } catch (error) {
      typing.remove();
      addMessage("assistant", error.message || "Assistant request failed.");
    } finally {
      setSendingState(false);
      input.value = "";
      autoresize();
      input.focus();
    }
  }

  toggleButton.addEventListener("click", function () {
    setPanelOpen(!isOpen);
  });

  function closePanelAndFocus() {
    setPanelOpen(false);
    toggleButton.focus();
  }

  closeButton.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    closePanelAndFocus();
  });

  closeButton.addEventListener("touchend", function (event) {
    event.preventDefault();
    event.stopPropagation();
    closePanelAndFocus();
  });

  panel.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-chat-close='true']")) {
      event.preventDefault();
      event.stopPropagation();
      closePanelAndFocus();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isOpen) {
      setPanelOpen(false);
      toggleButton.focus();
    }
  });

  input.addEventListener("input", autoresize);
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input.value);
    }
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    sendMessage(input.value);
  });

  if (starters) {
    starters.addEventListener("click", function (event) {
      var target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;
      var prompt = target.getAttribute("data-prompt");
      if (!prompt) return;
      sendMessage(prompt);
    });
  }

  starterWelcome();
  setTimeout(function () {
    if (!isOpen) {
      setNudgeVisible(true);
      nudgeTimer = setTimeout(function () {
        dismissNudge();
      }, 6500);
    }
  }, 1000);
})();
