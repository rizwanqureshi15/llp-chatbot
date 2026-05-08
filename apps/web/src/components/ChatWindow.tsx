import { useEffect, useMemo, useRef, useState } from "react";
import {
  createInitialLlpData,
  extractFormMarker,
} from "../config/llpFlow";
import {
  fetchChatMessages,
  sendAnswer,
  startChat,
  submitLlpData,
} from "../services/chatService";
import { clearChatState, loadChatState, saveChatState } from "../services/chatStorage";
import LlpNameForm from "./LlpNameForm";
import RegisteredOfficeForm from "./RegisteredOfficeForm";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import QuickReplies from "./QuickReplies";
import { Button } from "./ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";
import type { LlpFormData, Message } from "../types/chat";

export default function ChatWindow() {


  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [aiSessionId, setAiSessionId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<LlpFormData>>({});
  const [completed, setCompleted] = useState<boolean>(false);
  const [options, setOptions] = useState<string[]>([]);
  const [isAwaitingAi, setIsAwaitingAi] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const didInitializeRef = useRef<boolean>(false);
  const isSubmitting = submitStatus === "submitting";
  const isBusy = isSubmitting || isAwaitingAi;
  // Step logic is now AI-driven
  const [activeStep, setActiveStep] = useState<{ marker: string | null; question: string; options?: string[] } | null>(null);
  const showLlpNameForm = activeStep?.marker === "llp_name_preferences";



  const showRegisteredOfficeForm = false;
  const inputPlaceholder = useMemo(() => {
    if (completed) {
      return "Conversation completed. Start a new chat to continue.";
    }
    if (isAwaitingAi) {
      return "Waiting for assistant...";
    }
    return activeStep?.question || "Type your answer...";
  }, [activeStep, completed, isAwaitingAi]);

  const hasRequiredLlpData = (data: Partial<LlpFormData>): boolean => {
    const normalizedData = buildFinalData(data);

    return Boolean(
      normalizedData.applicant_name.trim() &&
        normalizedData.email.trim() &&
        normalizedData.phone.trim() &&
        normalizedData.proposed_llp_name.trim() &&
        normalizedData.business_activity.trim() &&
          normalizedData.registered_office_address_line1.trim() &&
          normalizedData.registered_office_city.trim() &&
          normalizedData.registered_office_state.trim() &&
          normalizedData.registered_office_country.trim() &&
          normalizedData.registered_office_zip_code.trim() &&
        normalizedData.total_partners > 0 &&
        normalizedData.designated_partners > 0 &&
        normalizedData.partner_details.length > 0 &&
        normalizedData.capital_contribution > 0 &&
        typeof normalizedData.agreement_required === "boolean" &&
        normalizedData.notes.trim(),
    );
  };

  const applyAssistantStep = async (
    questionText: string,
    responseOptions: string[] | undefined,
    updatedFormData?: Partial<LlpFormData>,

  ): Promise<void> => {
    const { cleanedText, marker } = extractFormMarker(questionText);

    // AI-driven: just show cleanedText and set active step
    if (cleanedText) appendBotMessage(cleanedText);
    setActiveStep({ marker: marker || null, question: cleanedText || questionText, options: responseOptions });
    setOptions(responseOptions || []);
    if (updatedFormData && hasRequiredLlpData(updatedFormData)) {
      const finalData = buildFinalData(updatedFormData);
      setCompleted(true);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Generated LLP JSON",
          type: "json",
          jsonData: finalData,
        },
      ]);
      await submitFinalData(finalData);
    }
  };

  const initializeChat = async (): Promise<void> => {
    setIsAwaitingAi(true);
    setMessages([]);
    setAiSessionId(null);
    setFormData({});
    setCompleted(false);
    setOptions([]);
    setSubmitStatus("idle");
    setSubmitError(null);

    try {
      const response = await startChat();
      const initialText = response.question || "Let's start your LLP registration intake.";
      setAiSessionId(response.session_id);
      await applyAssistantStep(initialText, response.options, undefined);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to start the LLP intake session.";
      setMessages([
        {
          sender: "bot",
          text: `Unable to start the LLP intake session: ${message}`,
        },
      ]);
      setOptions([]);
    } finally {
      setHasHydrated(true);
      setIsAwaitingAi(false);
    }
  };

  useEffect(() => {
    if (didInitializeRef.current) {
      return;
    }
    didInitializeRef.current = true;

    const hydrateChat = async (): Promise<void> => {
      const storedState = loadChatState();

      if (storedState && storedState.aiSessionId) {
        try {
          const dbMessages = await fetchChatMessages(storedState.aiSessionId);
          if (dbMessages.length > 0) {
            setMessages(dbMessages);
          } else {
            setMessages(storedState.messages);
          }
        } catch (error) {
          console.warn("Failed to load messages from database, using local cache.", error);
          setMessages(storedState.messages);
        }
        setCurrentStep(storedState.currentStep);
        setAiSessionId(storedState.aiSessionId);
        setFormData(storedState.formData);
        setCompleted(storedState.completed);
        setSubmitStatus(storedState.submitStatus);
        setSubmitError(storedState.submitError);
        setOptions([]);
        setHasHydrated(true);
        return;
      }

      await initializeChat();
    };

    void hydrateChat();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    saveChatState({
      messages,
      currentStep,
      aiSessionId,
      formData,
      completed,
      submitStatus,
      submitError,
    });
  }, [messages, currentStep, aiSessionId, formData, completed, submitStatus, submitError, hasHydrated]);


  // Always fetch latest messages from backend after user/assistant turn
  const syncMessagesFromBackend = async (sessionId: string | null) => {
    if (!sessionId) return;
    try {
      const dbMessages = await fetchChatMessages(sessionId);
      if (dbMessages.length > 0) {
        setMessages(dbMessages);
      }
    } catch (error) {
      // fallback: do nothing, keep current messages
    }
  };

  const appendBotMessage = (text: string): void => {
    setMessages((prev) => [...prev, { sender: "bot", text }]);
    // Also sync from backend if session exists
    if (aiSessionId) {
      void syncMessagesFromBackend(aiSessionId);
    }
  };

  const buildFinalData = (data: Partial<LlpFormData>): LlpFormData => {
    return {
      ...createInitialLlpData(),
      ...data,
      alternative_llp_names: Array.isArray(data.alternative_llp_names)
        ? data.alternative_llp_names
        : [],
      partner_details: Array.isArray(data.partner_details) ? data.partner_details : [],
    };
  };

  const buildNameSummary = (
    proposedName: string,
    alternativeNames: string[],
  ): string => {
    const lines = [`Preferred LLP Name: ${proposedName}`];

    alternativeNames.forEach((name, index) => {
      lines.push(`Alternative Name ${index + 1}: ${name}`);
    });

    return lines.join("\n");
  };

  const buildRegisteredOfficeSummary = (value: {
    registered_office_address_line1: string;
    registered_office_address_line2: string;
    registered_office_city: string;
    registered_office_state: string;
    registered_office_country: string;
    registered_office_zip_code: string;
  }): string => {
    const lines = [
      `Registered Office Address Line 1: ${value.registered_office_address_line1}`,
      `Registered Office Address Line 2: ${value.registered_office_address_line2 || "NA"}`,
      `Registered Office City: ${value.registered_office_city}`,
      `Registered Office State: ${value.registered_office_state}`,
      `Registered Office Country: ${value.registered_office_country}`,
      `Registered Office ZIP Code: ${value.registered_office_zip_code}`,
    ];

    return lines.join("\n");
  };

  const looksMeaningfulText = (value: string, minimumLength = 2): boolean => {
    const normalized = value.trim();

    if (normalized.length < minimumLength) {
      return false;
    }

    return /[A-Za-z]/.test(normalized);
  };

  const validateNameForm = (value: {
    proposed_llp_name: string;
    alternative_llp_names: string[];
  }): string | null => {
    if (!looksMeaningfulText(value.proposed_llp_name, 3)) {
      return "Please enter a meaningful LLP name.";
    }

    const invalidAlternative = value.alternative_llp_names.find(
      (item) => item.trim() && !looksMeaningfulText(item, 3),
    );

    if (invalidAlternative) {
      return "Alternative LLP names should look like valid business names.";
    }

    return null;
  };

  const validateRegisteredOfficeForm = (value: {
    registered_office_address_line1: string;
    registered_office_address_line2: string;
    registered_office_city: string;
    registered_office_state: string;
    registered_office_country: string;
    registered_office_zip_code: string;
  }): string | null => {
    if (!looksMeaningfulText(value.registered_office_address_line1, 5)) {
      return "Address line 1 does not look valid yet.";
    }

    if (!looksMeaningfulText(value.registered_office_city, 2)) {
      return "Please enter a valid city name.";
    }

    if (!looksMeaningfulText(value.registered_office_state, 2)) {
      return "Please enter a valid state name.";
    }

    if (!looksMeaningfulText(value.registered_office_country, 2)) {
      return "Please enter a valid country name.";
    }

    if (!/^[A-Za-z0-9\-\s]{4,10}$/.test(value.registered_office_zip_code.trim())) {
      return "ZIP/Postal code does not look valid yet.";
    }

    return null;
  };



  const submitFinalData = async (data: LlpFormData): Promise<void> => {
    setSubmitStatus("submitting");
    setSubmitError(null);
    appendBotMessage("Submitting your LLP details...");

    try {
      const response = await submitLlpData({
        data,
        submitted_at: new Date().toISOString(),
      });
      setSubmitStatus("success");
      appendBotMessage(
        response.id
          ? `Submission successful. Reference ID: ${response.id}`
          : response.message || "Submission successful.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Submission failed.";
      setSubmitStatus("error");
      setSubmitError(message);
      appendBotMessage(`Submission failed: ${message}`);
    }
  };


  const sendUserAnswer = async (
    answerText: string,
    updatedFormData: Partial<LlpFormData>,
  ): Promise<void> => {
    if (!aiSessionId) {
      appendBotMessage("Session expired. Start a new chat to continue.");
      return;
    }

    setFormData(updatedFormData);
    setIsAwaitingAi(true);

    try {
      const response = await sendAnswer({
        session_id: aiSessionId,
        answer: answerText,
      });
      await applyAssistantStep(response.question || "", response.options, updatedFormData);
      // Always sync messages from backend after assistant responds
      await syncMessagesFromBackend(aiSessionId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to continue the LLP intake.";
      appendBotMessage(`Unable to continue the LLP intake: ${message}`);
    } finally {
      setIsAwaitingAi(false);
    }
  };


  const handleSend = async (text: string) => {
    if (completed || isBusy || !activeStep) return;

    setMessages((prev) => [...prev, { sender: "user", text }]);
    // Always sync messages from backend after user sends
    if (aiSessionId) {
      await syncMessagesFromBackend(aiSessionId);
    }

    const updatedFormData = {
      ...formData,
    } as Partial<LlpFormData>;

    await sendUserAnswer(text, updatedFormData);
  };


  const handleNameFormSubmit = async (value: {
    proposed_llp_name: string;
    alternative_llp_names: string[];
  }): Promise<void> => {
    if (completed || isBusy) return;

    const validationError = validateNameForm(value);
    if (validationError) {
      appendBotMessage(validationError);
      return;
    }

    const updatedFormData = {
      ...formData,
      proposed_llp_name: value.proposed_llp_name,
      alternative_llp_names: value.alternative_llp_names,
    } as Partial<LlpFormData>;

    const userMessageText = buildNameSummary(
      value.proposed_llp_name,
      value.alternative_llp_names,
    );

    setMessages((prev) => [...prev, { sender: "user", text: userMessageText }]);
    if (aiSessionId) {
      await syncMessagesFromBackend(aiSessionId);
    }

    await sendUserAnswer(
      userMessageText,
      updatedFormData,
    );
  };

  const handleReset = (): void => {
    clearChatState();
    void initializeChat();
  };


  const handleRegisteredOfficeFormSubmit = async (value: {
    registered_office_address_line1: string;
    registered_office_address_line2: string;
    registered_office_city: string;
    registered_office_state: string;
    registered_office_country: string;
    registered_office_zip_code: string;
  }): Promise<void> => {
    if (completed || isBusy) return;

    const validationError = validateRegisteredOfficeForm(value);
    if (validationError) {
      appendBotMessage(validationError);
      return;
    }

    const updatedFormData = {
      ...formData,
      registered_office_address_line1: value.registered_office_address_line1,
      registered_office_address_line2: value.registered_office_address_line2,
      registered_office_city: value.registered_office_city,
      registered_office_state: value.registered_office_state,
      registered_office_country: value.registered_office_country,
      registered_office_zip_code: value.registered_office_zip_code,
    } as Partial<LlpFormData>;

    const userMessageText = buildRegisteredOfficeSummary(value);

    setMessages((prev) => [...prev, { sender: "user", text: userMessageText }]);
    if (aiSessionId) {
      await syncMessagesFromBackend(aiSessionId);
    }

    await sendUserAnswer(userMessageText, updatedFormData);
  };

  const handleRetrySubmit = async (): Promise<void> => {
    if (!completed || isSubmitting) return;
    await submitFinalData(buildFinalData(formData));
  };

  return (
    <Card className="mx-auto my-5 flex h-[82vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-border/70 bg-card/85 shadow-[0_20px_60px_rgba(20,36,36,0.15)] backdrop-blur-sm">
      <CardHeader className="flex-row items-center justify-between border-b border-border bg-gradient-to-r from-primary to-sky-500 px-4 py-3 text-primary-foreground">
        <div>
          <CardTitle className="text-base tracking-wide">LLP Assistant</CardTitle>
          <CardDescription className="text-xs text-primary-foreground/85">Guided intake for LLP formation details</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {submitStatus === "error" && completed && (
            <Button
              onClick={handleRetrySubmit}
              disabled={isSubmitting}
              variant="secondary"
              size="sm"
              className="border border-white/20 bg-white/18 text-primary-foreground hover:bg-white/28"
            >
              Retry Submit
            </Button>
          )}
          <Button onClick={handleReset} variant="secondary" size="sm" className="text-primary">
            New Chat
          </Button>
        </div>
      </CardHeader>

      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-background to-muted/25 p-3 md:p-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {submitStatus === "submitting" && (
          <div className="mt-2 text-sm italic text-muted-foreground">Submitting LLP details...</div>
        )}

        {submitError && <div className="mt-2 text-sm font-medium text-destructive">Error: {submitError}</div>}

        {options.length > 0 && !completed && (
          <QuickReplies
            options={options}
            onSelect={handleSend}
            disabled={isBusy || !aiSessionId}
          />
        )}

        {showLlpNameForm && !completed && (
          <LlpNameForm
            disabled={isBusy || !aiSessionId}
            initialValue={{
              proposed_llp_name: formData.proposed_llp_name,
              alternative_llp_names: formData.alternative_llp_names,
            }}
            onSubmit={(value) => {
              void handleNameFormSubmit(value);
            }}
          />
        )}

        {showRegisteredOfficeForm && !completed && (
          <RegisteredOfficeForm
            disabled={isBusy || !aiSessionId}
            initialValue={{
              registered_office_address_line1: formData.registered_office_address_line1,
              registered_office_address_line2: formData.registered_office_address_line2,
              registered_office_city: formData.registered_office_city,
              registered_office_state: formData.registered_office_state,
              registered_office_country: formData.registered_office_country,
              registered_office_zip_code: formData.registered_office_zip_code,
            }}
            onSubmit={(value) => {
              void handleRegisteredOfficeFormSubmit(value);
            }}
          />
        )}

        <div ref={bottomRef} />
      </div>

      <ChatInput
        onSend={handleSend}
        disabled={completed || isBusy || showLlpNameForm || showRegisteredOfficeForm || !aiSessionId}
        placeholder={inputPlaceholder}
      />
    </Card>
  );
}
