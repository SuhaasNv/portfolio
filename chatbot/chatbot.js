(function () {
  "use strict";

  var defaultApiEndpoints = [window.location.origin + "/api/chat", "https://portfolio-7f8t.vercel.app/api/chat"];
  var apiEndpoints = [];
  if (window.PORTFOLIO_CHAT_API_URL) {
    apiEndpoints.push(window.PORTFOLIO_CHAT_API_URL);
  }
  defaultApiEndpoints.forEach(function (endpoint) {
    if (apiEndpoints.indexOf(endpoint) === -1) {
      apiEndpoints.push(endpoint);
    }
  });

  var toggleButton = document.getElementById("chatbot-toggle");
  var panel = document.getElementById("chatbot-panel");
  var closeButton = document.getElementById("chatbot-close");
  var nudge = document.getElementById("chatbot-nudge");
  var resizeHandle = document.getElementById("chatbot-resize-handle");
  var messages = document.getElementById("chatbot-messages");
  var starters = document.getElementById("chatbot-starters");
  var form = document.getElementById("chatbot-form");
  var input = document.getElementById("chatbot-input");
  var sendButton = document.getElementById("chatbot-send");
  var stopButton = document.getElementById("chatbot-stop");
  var newChatButton = document.getElementById("chatbot-new-chat");
  var exportPdfButton = document.getElementById("chatbot-export-pdf");
  var strictModeToggle = document.getElementById("chatbot-strict-mode");

  if (!toggleButton || !panel || !messages || !form || !input || !sendButton) {
    return;
  }

  function isStrictModeEnabled() {
    return !strictModeToggle || strictModeToggle.checked;
  }

  var history = [];
  var isOpen = false;
  var isSending = false;
  var nudgeTimer = null;
  var closeTimer = null;
  var PANEL_ANIMATION_MS = 220;
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var typingRequestId = null;
  var MIN_THINKING_MS = 900;
  var TYPE_DELAY_MS = 24;
  var activeAbortController = null;
  var activeAssistantNode = null;

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

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setupResizablePanel() {
    if (!resizeHandle || window.matchMedia("(max-width: 600px)").matches) return;

    resizeHandle.addEventListener("mousedown", function (event) {
      event.preventDefault();
      var startX = event.clientX;
      var startY = event.clientY;
      var panelRect = panel.getBoundingClientRect();
      var startWidth = panelRect.width;
      var startHeight = panelRect.height;
      var maxWidth = window.innerWidth - 24;
      var maxHeight = window.innerHeight - 80;

      function onMove(moveEvent) {
        var deltaX = startX - moveEvent.clientX;
        var deltaY = startY - moveEvent.clientY;
        var nextWidth = clamp(startWidth + deltaX, 360, maxWidth);
        var nextHeight = clamp(startHeight + deltaY, 420, maxHeight);
        panel.style.setProperty("--chatbot-panel-width", nextWidth + "px");
        panel.style.setProperty("--chatbot-panel-height", nextHeight + "px");
      }

      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
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
      renderCitations(wrapper, citations);
    }
    if (role === "user") {
      renderUserActions(wrapper, text);
    }

    return wrapper;
  }

  function renderCitations(messageNode, citations) {
    var citationsWrap = document.createElement("div");
    citationsWrap.className = "chatbot-citations";
    var previewNode = null;

    citations.slice(0, 4).forEach(function (citation) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "chatbot-citation-btn";
      button.textContent = citation.title || "Source";
      button.addEventListener("click", function () {
        var isSame = previewNode && previewNode.getAttribute("data-cite-title") === (citation.title || "");
        if (isSame) {
          previewNode.remove();
          previewNode = null;
          return;
        }
        if (previewNode) {
          previewNode.remove();
          previewNode = null;
        }
        previewNode = document.createElement("div");
        previewNode.className = "chatbot-citation-preview";
        previewNode.setAttribute("data-cite-title", citation.title || "");

        var title = document.createElement("strong");
        title.textContent = citation.title || "Source";

        var snippet = document.createElement("p");
        snippet.textContent = citation.snippet || "No snippet available.";

        var sourceLink = document.createElement("a");
        sourceLink.href = citation.url || "#";
        sourceLink.target = "_blank";
        sourceLink.rel = "noopener noreferrer";
        sourceLink.textContent = "Open source";

        previewNode.appendChild(title);
        previewNode.appendChild(snippet);
        previewNode.appendChild(sourceLink);
        messageNode.appendChild(previewNode);
        scrollToBottom();
      });
      citationsWrap.appendChild(button);
    });

    messageNode.appendChild(citationsWrap);
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
    } finally {
      document.body.removeChild(textarea);
    }
    return Promise.resolve();
  }

  function renderAssistantActions(messageNode, answerText, sourcePrompt) {
    if (!sourcePrompt) return;

    var actions = document.createElement("div");
    actions.className = "chatbot-message-actions";

    var copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "chatbot-action-btn";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", function () {
      copyTextToClipboard(answerText || "")
        .then(function () {
          copyBtn.textContent = "Copied";
          setTimeout(function () {
            copyBtn.textContent = "Copy";
          }, 1000);
        })
        .catch(function () {
          copyBtn.textContent = "Copy failed";
          setTimeout(function () {
            copyBtn.textContent = "Copy";
          }, 1200);
        });
    });

    var regenBtn = document.createElement("button");
    regenBtn.type = "button";
    regenBtn.className = "chatbot-action-btn";
    regenBtn.textContent = "Regenerate";
    regenBtn.addEventListener("click", function () {
      sendMessage(sourcePrompt, { regenerate: true });
    });

    var pinBtn = document.createElement("button");
    pinBtn.type = "button";
    pinBtn.className = "chatbot-action-btn";
    pinBtn.textContent = "Pin";
    pinBtn.addEventListener("click", function () {
      var nowPinned = !messageNode.classList.contains("pinned");
      messageNode.classList.toggle("pinned", nowPinned);
      pinBtn.classList.toggle("pinned", nowPinned);
      pinBtn.textContent = nowPinned ? "Pinned" : "Pin";
    });

    actions.appendChild(copyBtn);
    actions.appendChild(regenBtn);
    actions.appendChild(pinBtn);

    var shareBtn = document.createElement("button");
    shareBtn.type = "button";
    shareBtn.className = "chatbot-action-btn";
    shareBtn.textContent = "Share";
    shareBtn.addEventListener("click", function () {
      shareAnswerDeepLink(answerText, sourcePrompt, shareBtn);
    });
    actions.appendChild(shareBtn);

    messageNode.appendChild(actions);
  }

  function renderUserActions(messageNode, messageText) {
    var actions = document.createElement("div");
    actions.className = "chatbot-message-actions";

    var editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "chatbot-action-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", function () {
      input.value = messageText || "";
      autoresize();
      input.focus();
    });

    var resendBtn = document.createElement("button");
    resendBtn.type = "button";
    resendBtn.className = "chatbot-action-btn";
    resendBtn.textContent = "Resend";
    resendBtn.addEventListener("click", function () {
      sendMessage(messageText || "");
    });

    actions.appendChild(editBtn);
    actions.appendChild(resendBtn);
    messageNode.appendChild(actions);
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

  function typeAssistantMessage(node, fullText) {
    if (prefersReducedMotion) {
      node.textContent = fullText;
      return Promise.resolve();
    }

    node.classList.add("typing");
    var index = 0;
    var text = String(fullText || "");
    var step = 1;

    return new Promise(function (resolve) {
      function tick() {
        index = Math.min(text.length, index + step);
        node.textContent = text.slice(0, index);
        scrollToBottom();
        if (index >= text.length) {
          node.classList.remove("typing");
          typingRequestId = null;
          resolve();
          return;
        }
        typingRequestId = window.setTimeout(tick, TYPE_DELAY_MS);
      }
      tick();
    });
  }

  function waitForThinkingWindow(startTime) {
    var elapsed = Date.now() - startTime;
    var remaining = Math.max(0, MIN_THINKING_MS - elapsed);
    if (!remaining) return Promise.resolve();
    return new Promise(function (resolve) {
      setTimeout(resolve, remaining);
    });
  }

  function toBase64Url(value) {
    var utf8 = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, function (_, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    });
    return btoa(utf8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function fromBase64Url(value) {
    var base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    var binary = atob(base64);
    var percentEncoded = binary
      .split("")
      .map(function (char) {
        return "%" + char.charCodeAt(0).toString(16).padStart(2, "0");
      })
      .join("");
    return decodeURIComponent(percentEncoded);
  }

  function buildShareUrl(answerText, sourcePrompt) {
    var payload = JSON.stringify({
      q: String(sourcePrompt || "").slice(0, 220),
      a: String(answerText || "").slice(0, 900)
    });
    var encoded = toBase64Url(payload);
    return window.location.origin + window.location.pathname + "#chat=" + encoded;
  }

  function shareAnswerDeepLink(answerText, sourcePrompt, buttonRef) {
    var url = buildShareUrl(answerText, sourcePrompt);
    if (navigator.share) {
      navigator
        .share({
          title: "Suhaas Portfolio Assistant",
          text: "Shared answer from Suhaas' portfolio assistant",
          url: url
        })
        .catch(function () {});
      return;
    }
    copyTextToClipboard(url)
      .then(function () {
        if (!buttonRef) return;
        buttonRef.textContent = "Link copied";
        setTimeout(function () {
          buttonRef.textContent = "Share";
        }, 1200);
      })
      .catch(function () {});
  }

  function maybeLoadSharedAnswerFromHash() {
    var hash = window.location.hash || "";
    if (!hash.startsWith("#chat=")) return;

    try {
      var encoded = hash.slice("#chat=".length);
      var decoded = fromBase64Url(encoded);
      var parsed = JSON.parse(decoded);
      var sharedPrompt = String(parsed.q || "").trim();
      var sharedAnswer = String(parsed.a || "").trim();
      if (!sharedAnswer) return;

      setPanelOpen(true);
      starters.hidden = true;
      if (sharedPrompt) {
        addMessage("user", sharedPrompt);
        history.push({ role: "user", content: sharedPrompt });
      }
      var sharedNode = addMessage("assistant", sharedAnswer);
      renderAssistantActions(sharedNode, sharedAnswer, sharedPrompt);
      history.push({ role: "assistant", content: sharedAnswer });
      history = history.slice(-8);
    } catch (error) {}
  }

  function exportSummaryToPdf() {
    var lines = [];
    lines.push("Suhaas Portfolio Assistant - Chat Summary");
    lines.push("Generated: " + new Date().toLocaleString());
    lines.push("");

    if (!history.length) {
      lines.push("No chat history available yet.");
    } else {
      for (var i = 0; i < history.length; i += 1) {
        var item = history[i];
        var prefix = item.role === "user" ? "User" : "Assistant";
        lines.push(prefix + ": " + String(item.content || "").trim());
        lines.push("");
      }
    }

    var printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    var escaped = lines.join("\n").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    printWindow.document.write(
      "<!doctype html><html><head><title>Chat Summary</title>" +
        "<style>body{font-family:Arial,sans-serif;padding:24px;line-height:1.5;color:#111;}pre{white-space:pre-wrap;font-family:inherit;font-size:14px;}</style>" +
        "</head><body><pre>" +
        escaped +
        "</pre><script>window.onload=function(){window.print();};<\/script></body></html>"
    );
    printWindow.document.close();
  }

  function setSendingState(sending) {
    isSending = sending;
    sendButton.disabled = sending;
    sendButton.textContent = sending ? "Sending..." : "Send";
    input.disabled = sending;
    if (stopButton) {
      stopButton.hidden = !sending;
    }
  }

  function stopGeneration() {
    if (!isSending) return;
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    if (typingRequestId) {
      clearTimeout(typingRequestId);
      typingRequestId = null;
    }
    if (activeAssistantNode) {
      activeAssistantNode.classList.remove("typing");
      if (!activeAssistantNode.textContent.trim()) {
        activeAssistantNode.textContent = "Generation stopped.";
      } else {
        activeAssistantNode.textContent += "\n\n[Generation stopped]";
      }
    }
    setSendingState(false);
    input.disabled = false;
  }

  function starterWelcome() {
    addMessage(
      "assistant",
      "Hi, I am Suhaas' portfolio assistant. Ask me about projects, tech stack, education, certifications, or systems design strengths."
    );
  }

  async function queryAssistant(userText, strictOnlySources, abortSignal) {
    var lastError = "Unable to reach the assistant service.";

    for (var i = 0; i < apiEndpoints.length; i += 1) {
      var endpoint = apiEndpoints[i];
      var response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: userText,
            history: history,
            strict_only_sources: strictOnlySources
          }),
          signal: abortSignal
        });
      } catch (networkError) {
        if (networkError && networkError.name === "AbortError") {
          throw new Error("Generation stopped.");
        }
        lastError = "Could not connect to chat API.";
        continue;
      }

      var payload = {};
      try {
        payload = await response.json();
      } catch (error) {
        payload = {};
      }

      if (response.ok) {
        return payload;
      }

      if (response.status === 404) {
        lastError = "Chat API endpoint not found on current deployment.";
        continue;
      }

      if (response.status === 500 && payload.error === "Server is missing GROQ_API_KEY.") {
        throw new Error("Backend is live, but GROQ_API_KEY is missing in server environment variables.");
      }

      throw new Error(payload.error || "Unable to reach the assistant service.");
    }
    throw new Error(lastError);
  }

  async function queryAssistantStream(userText, onToken, strictOnlySources, abortSignal) {
    var lastError = "Unable to reach the assistant service.";

    for (var i = 0; i < apiEndpoints.length; i += 1) {
      var endpoint = apiEndpoints[i];
      var response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: userText,
            history: history,
            stream: true,
            strict_only_sources: strictOnlySources
          }),
          signal: abortSignal
        });
      } catch (networkError) {
        if (networkError && networkError.name === "AbortError") {
          throw new Error("Generation stopped.");
        }
        lastError = "Could not connect to chat API.";
        continue;
      }

      if (!response.ok) {
        if (response.status === 404) {
          lastError = "Chat API endpoint not found on current deployment.";
          continue;
        }

        var errorPayload = {};
        try {
          errorPayload = await response.json();
        } catch (error) {
          errorPayload = {};
        }
        if (response.status === 500 && errorPayload.error === "Server is missing GROQ_API_KEY.") {
          throw new Error("Backend is live, but GROQ_API_KEY is missing in server environment variables.");
        }
        throw new Error(errorPayload.error || "Unable to reach the assistant service.");
      }

      if (!response.body || typeof response.body.getReader !== "function") {
        continue;
      }

      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";
      var streamedAnyToken = false;
      var finalPayload = { answer: "", citations: [], retrieved_count: 0, _streamed: false };

      while (true) {
        var chunk = await reader.read();
        if (chunk.done) break;

        buffer += decoder.decode(chunk.value, { stream: true });
        var lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (var lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
          var line = lines[lineIndex].trim();
          if (!line) continue;

          var eventData = null;
          try {
            eventData = JSON.parse(line);
          } catch (error) {
            continue;
          }

          if (eventData.type === "start") {
            finalPayload.citations = eventData.citations || [];
            finalPayload.retrieved_count = eventData.retrieved_count || 0;
          } else if (eventData.type === "token") {
            var delta = eventData.delta || "";
            if (!delta) continue;
            streamedAnyToken = true;
            finalPayload._streamed = true;
            finalPayload.answer += delta;
            if (typeof onToken === "function") {
              onToken(finalPayload.answer, delta);
            }
          } else if (eventData.type === "done") {
            finalPayload.answer = eventData.answer || finalPayload.answer;
            finalPayload.citations = eventData.citations || finalPayload.citations;
            finalPayload.retrieved_count = eventData.retrieved_count || finalPayload.retrieved_count;
          } else if (eventData.type === "error") {
            throw new Error(eventData.error || "Stream request failed.");
          }
        }
      }

      if (streamedAnyToken || finalPayload.answer) {
        return finalPayload;
      }
    }

    throw new Error(lastError);
  }

  async function sendMessage(rawText, options) {
    var text = String(rawText || "").trim();
    var config = options || {};
    if (!text || isSending) return;

    if (!config.regenerate) {
      addMessage("user", text);
    }
    setSendingState(true);

    var typing = addThinkingSkeleton();
    starters.hidden = true;
    var requestStartedAt = Date.now();
    var strictOnlySources = isStrictModeEnabled();
    activeAbortController = new AbortController();

    try {
      var answerNode = addMessage("assistant", "");
      activeAssistantNode = answerNode;
      var payload;
      try {
        payload = await queryAssistantStream(text, null, strictOnlySources, activeAbortController.signal);
      } catch (streamError) {
        if (streamError && streamError.message === "Generation stopped.") {
          throw streamError;
        }
        payload = await queryAssistant(text, strictOnlySources, activeAbortController.signal);
      }

      await waitForThinkingWindow(requestStartedAt);

      if (typing) {
        typing.remove();
        typing = null;
      }

      var answer = payload.answer || "I could not generate an answer right now. Please try a different question.";
      await typeAssistantMessage(answerNode, answer);

      renderAssistantActions(answerNode, answer, text);

      if (Array.isArray(payload.citations) && payload.citations.length > 0) {
        renderCitations(answerNode, payload.citations);
      }

      if (config.regenerate) {
        for (var idx = history.length - 1; idx >= 0; idx -= 1) {
          if (history[idx].role === "assistant") {
            history[idx] = { role: "assistant", content: answer };
            break;
          }
        }
      } else {
        history.push({ role: "user", content: text });
        history.push({ role: "assistant", content: answer });
      }
      history = history.slice(-8);
    } catch (error) {
      if (typing) {
        typing.remove();
      }
      if (!error || error.message !== "Generation stopped.") {
        addMessage("assistant", error.message || "Assistant request failed.");
      }
    } finally {
      activeAbortController = null;
      activeAssistantNode = null;
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

  if (stopButton) {
    stopButton.addEventListener("click", function () {
      stopGeneration();
    });
  }

  if (newChatButton) {
    newChatButton.addEventListener("click", function () {
      stopGeneration();
      history = [];
      messages.innerHTML = "";
      starters.hidden = false;
      starterWelcome();
      input.value = "";
      autoresize();
      input.focus();
    });
  }

  if (exportPdfButton) {
    exportPdfButton.addEventListener("click", function () {
      exportSummaryToPdf();
    });
  }

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
  maybeLoadSharedAnswerFromHash();
  setupResizablePanel();
  setTimeout(function () {
    if (!isOpen) {
      setNudgeVisible(true);
      nudgeTimer = setTimeout(function () {
        dismissNudge();
      }, 6500);
    }
  }, 1000);
})();
