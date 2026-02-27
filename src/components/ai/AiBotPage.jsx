import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

import { ArrowLeft, ImagePlus, Loader2, Send } from "lucide-react";

import { getApiBaseUrl } from "../../utils/apiBaseUrl";
import { geminiChat } from "../../utils/ai/geminiClient";

function extractJsonObject(text) {
  const s = String(text || "");
  const firstBrace = s.indexOf("{");
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  const candidate = s.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(candidate);
  } catch (_e) {
    return null;
  }
}

function normalizeFormPayload(payload) {
  const p = payload && typeof payload === "object" ? payload : {};
  const fields = Array.isArray(p.fields) ? p.fields : [];
  const normalizedFields = fields
    .filter((f) => f && typeof f === "object")
    .map((f, idx) => ({
      key: String(f.key || f.name || `field_${idx}`),
      label: String(f.label || f.key || f.name || `Field ${idx + 1}`),
      value: f.value == null ? "" : String(f.value),
    }));

  return {
    entryType: String(p.entryType || p.type || "unknown"),
    fields: normalizedFields,
    notes: p.notes == null ? "" : String(p.notes),
  };
}

export default function AiBotPage({ role = "owner" }) {
  const navigate = useNavigate();
  const apiBase = getApiBaseUrl();

  const fileInputRef = useRef(null);

  const [imageFile, setImageFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [chatPending, setChatPending] = useState(false);
  const [chatDraft, setChatDraft] = useState("");

  const [botMessages, setBotMessages] = useState(() => [
    {
      role: "assistant",
      text: "Namaste! Photo add karo, phir Done dabao. Main form bana dunga.",
    },
  ]);

  const [formDraft, setFormDraft] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const chatSystemPrompt = useMemo(() => {
    const roleLabel = role === "manager" ? "Manager" : "Owner";
    return [
      "You are Godam AI Assistant.",
      `The user is a ${roleLabel} using Godam software for data collection and data entry.`,
      "Be helpful and practical.",
      "Ask short clarifying questions if needed.",
      "Reply in simple Hindi (mix Hindi/English ok).",
    ].join("\n");
  }, [role]);

  const imageToFormSystemPrompt = useMemo(() => {
    const roleLabel = role === "manager" ? "Manager" : "Owner";
    return [
      "You are Godam AI Assistant.",
      `The user is a ${roleLabel} using Godam software for data collection.`,
      "You will receive an image. Extract structured data suitable for data-entry.",
      "Return ONLY valid JSON (no markdown, no backticks).",
      "JSON schema:",
      "{",
      '  \"entryType\": \"...\",',
      '  \"fields\": [ { \"key\": \"...\", \"label\": \"...\", \"value\": \"...\" } ],',
      '  \"notes\": \"...\"',
      "}",
      "Use Hindi labels where helpful.",
    ].join("\n");
  }, [role]);

  const pickPhoto = () => {
    fileInputRef.current?.click?.();
  };

  const onPhotoSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setFormDraft(null);
    setBotMessages((prev) => [
      ...prev,
      { role: "user", text: `Photo added: ${file.name}` },
      { role: "assistant", text: "Ok. Ab Done dabao to main analyze karu." },
    ]);
    e.target.value = "";
  };

  const sendChat = async () => {
    const text = String(chatDraft || "").trim();
    if (!text) return;
    if (chatPending || analyzing || submitting) return;

    setChatPending(true);
    setBotMessages((prev) => [...prev, { role: "user", text }]);
    setChatDraft("");

    try {
      const nextMessages = [...botMessages, { role: "user", text }];
      const reply = await geminiChat({
        systemPrompt: chatSystemPrompt,
        messages: nextMessages,
      });

      setBotMessages((prev) => [...prev, { role: "assistant", text: reply || "(No response)" }]);
    } catch (e) {
      toast.error("Gemini error", { description: e?.message || "Failed" });
      setBotMessages((prev) => [...prev, { role: "assistant", text: "Sorry, abhi reply nahi aa paya." }]);
    } finally {
      setChatPending(false);
    }
  };

  const analyzeToForm = async () => {
    if (!imageFile) {
      toast.error("Pehle photo add karo");
      return;
    }
    if (analyzing) return;

    setAnalyzing(true);
    setBotMessages((prev) => [...prev, { role: "user", text: "Done" }]);

    try {
      const responseText = await geminiChat({
        systemPrompt: imageToFormSystemPrompt,
        messages: [{ role: "user", text: "Analyze this image and generate the JSON form." }],
        imageFile,
      });

      const parsed = extractJsonObject(responseText);
      if (!parsed) {
        setBotMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "Image analyze ho gaya, lekin form JSON parse nahi hua. Please ek baar phir try karo.",
          },
        ]);
        return;
      }

      const nextForm = normalizeFormPayload(parsed);
      setFormDraft(nextForm);

      setBotMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Form ready hai. Aap edit kar sakte ho, phir niche Done dabao." },
      ]);
    } catch (e) {
      toast.error("Gemini error", { description: e?.message || "Failed" });
      setBotMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, abhi analyze nahi ho paaya. Thoda baad try karo." },
      ]);
    } finally {
      setAnalyzing(false);
    }
  };

  const updateField = (idx, patch) => {
    setFormDraft((prev) => {
      if (!prev) return prev;
      const fields = Array.isArray(prev.fields) ? [...prev.fields] : [];
      fields[idx] = { ...fields[idx], ...patch };
      return { ...prev, fields };
    });
  };

  const submitEntry = async () => {
    if (!formDraft) {
      toast.error("Form abhi ready nahi hai");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/api/ai/entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          entryType: formDraft.entryType,
          fields: formDraft.fields,
          notes: formDraft.notes,
          source: "gemini-image",
          image: imageFile
            ? { name: imageFile.name, type: imageFile.type, size: imageFile.size }
            : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Submit failed (${res.status})`);

      toast.success("Entry submitted");
      setBotMessages((prev) => [
        ...prev,
        { role: "user", text: "Done" },
        { role: "assistant", text: "Done. Entry system me chali gayi." },
      ]);

      // Reset for next entry
      setImageFile(null);
      setFormDraft(null);
    } catch (e) {
      toast.error("Submit error", { description: e?.message || "Failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="text-base font-semibold text-gray-900">AI Bot</div>
              <div className="text-xs text-gray-500">Photo → Form → Done</div>
            </div>
          </div>

          <Button variant="outline" onClick={() => navigate("/")}>Home</Button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 app-content-safe-bottom">
        {/* Chat-like messages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {botMessages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl border px-3 py-2 text-sm ${m.role === "user" ? "bg-white" : "bg-gray-50"}`}>
                    <div className="whitespace-pre-wrap break-words">{m.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2">
              <Textarea
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder="Yaha normal chat message likho..."
                disabled={chatPending || analyzing || submitting}
              />

              <Button
                onClick={sendChat}
                disabled={!chatDraft.trim() || chatPending || analyzing || submitting}
              >
                {chatPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Send
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Photo add */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onPhotoSelected}
            />

            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-gray-700 truncate">
                {imageFile ? imageFile.name : "No photo added"}
              </div>
              <Button variant="outline" onClick={pickPhoto} disabled={analyzing || chatPending || submitting}>
                <ImagePlus className="h-4 w-4 mr-2" /> Add Photo
              </Button>
            </div>

            <Button
              className="w-full"
              onClick={analyzeToForm}
              disabled={!imageFile || analyzing || submitting || chatPending}
            >
              {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Done
            </Button>
          </CardContent>
        </Card>

        {/* Generated editable form */}
        {formDraft ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Generated Form (Editable)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="text-xs text-gray-500">Entry Type</div>
                <Input
                  value={formDraft.entryType}
                  onChange={(e) => setFormDraft((p) => ({ ...p, entryType: e.target.value }))}
                />
              </div>

              <div className="space-y-3">
                {formDraft.fields.map((f, idx) => (
                  <div key={`${f.key}-${idx}`} className="grid grid-cols-1 gap-2">
                    <Input
                      value={f.label}
                      onChange={(e) => updateField(idx, { label: e.target.value })}
                    />
                    <Input
                      value={f.value}
                      onChange={(e) => updateField(idx, { value: e.target.value })}
                      placeholder="Value"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="text-xs text-gray-500">Notes</div>
                <Textarea
                  value={formDraft.notes}
                  onChange={(e) => setFormDraft((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional"
                />
              </div>

              <Button
                className="w-full"
                onClick={submitEntry}
                disabled={submitting || analyzing || chatPending}
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Done
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
