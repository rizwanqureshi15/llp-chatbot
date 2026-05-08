import { useEffect, useMemo, useRef, useState } from "react";
import {
  LLP_QUESTIONS,
  createInitialLlpData,
  extractFormMarker,
  getLlpQuestionByMarker,
  getLlpStepIndexByMarker,
  isLikelyOffTopicInput,
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
import type { LlpFieldKey, LlpFormData, Message } from "../types/chat";

export default function ChatWindow() {
  const REGISTERED_OFFICE_FIELDS: LlpFieldKey[] = [
    "registered_office_address_line1",
    "registered_office_address_line2",
    "registered_office_city",
    "registered_office_state",
    "registered_office_country",
    "registered_office_zip_code",
  ];

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
  const activeStep = LLP_QUESTIONS[currentStep];
  const showLlpNameForm = activeStep?.field === "proposed_llp_name";

  const hasRegisteredOfficeData = (data: Partial<LlpFormData>): boolean => {
    return Boolean(
      data.registered_office_address_line1?.trim() &&
        data.registered_office_city?.trim() &&
        data.registered_office_state?.trim() &&
        data.registered_office_country?.trim() &&
        data.registered_office_zip_code?.trim(),
    );
  };

  const showRegisteredOfficeForm =
    Boolean(activeStep?.field && REGISTERED_OFFICE_FIELDS.includes(activeStep.field)) &&
    !hasRegisteredOfficeData(formData);
  const inputPlaceholder = useMemo(() => {
    if (completed) {
      return "Conversation completed. Start a new chat to continue.";
    }

    if (isAwaitingAi) {
      return "Waiting for assistant...";
    }

    return activeStep?.placeholder || "Type your answer...";
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
    fallbackStepIndex = 0,
  ): Promise<void> => {
    const { cleanedText, marker } = extractFormMarker(questionText);

    const markerStep = marker ? getLlpQuestionByMarker(marker) : undefined;
    const markerField = markerStep?.field;
    const shouldSkipAddressMarker =
      Boolean(markerField) &&
      REGISTERED_OFFICE_FIELDS.includes(markerField as LlpFieldKey) &&
      Boolean(updatedFormData) &&
      hasRegisteredOfficeData(updatedFormData || {});

    if (cleanedText && !shouldSkipAddressMarker && !marker) {
      appendBotMessage(cleanedText);
    }

    if (marker) {
      if (shouldSkipAddressMarker) {
        const nextStepIndex = LLP_QUESTIONS.findIndex(
          (step) => step.field === "total_partners",
        );
        const resolvedNextStepIndex = nextStepIndex >= 0 ? nextStepIndex : fallbackStepIndex + 1;
        const nextStep = LLP_QUESTIONS[resolvedNextStepIndex];

        if (nextStep) {
          setCurrentStep(resolvedNextStepIndex);
          setOptions(nextStep.options || []);
          appendBotMessage(nextStep.question);
        }
        return;
      }

      const stepIndex = getLlpStepIndexByMarker(marker);
      const nextStep = getLlpQuestionByMarker(marker);
      const isMarkerOnlyRepeat = !cleanedText && stepIndex === fallbackStepIndex;
      let resolvedStepIndex =
        isMarkerOnlyRepeat && fallbackStepIndex < LLP_QUESTIONS.length - 1
          ? fallbackStepIndex + 1
          : stepIndex >= 0
            ? stepIndex
            : fallbackStepIndex;

      // Keep progression strict: do not allow AI marker jumps beyond the immediate next step.
      if (updatedFormData && resolvedStepIndex > fallbackStepIndex + 1) {
        resolvedStepIndex = Math.min(fallbackStepIndex + 1, LLP_QUESTIONS.length - 1);
      }

      const resolvedStep = LLP_QUESTIONS[resolvedStepIndex] || nextStep;

      if (!shouldSkipAddressMarker) {
        if (updatedFormData && resolvedStep?.question) {
          appendBotMessage(resolvedStep.question);
        } else if (cleanedText) {
          appendBotMessage(cleanedText);
        } else if (resolvedStep?.question) {
          appendBotMessage(resolvedStep.question);
        }
      }

      setCurrentStep(resolvedStepIndex);

      setOptions(responseOptions || resolvedStep?.options || []);
      return;
    }

    setOptions([]);

    if (updatedFormData && hasRequiredLlpData(updatedFormData)) {
      const finalData = buildFinalData(updatedFormData);
      setCompleted(true);
      setCurrentStep(LLP_QUESTIONS.length);
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
      return;
    }

    // Safety fallback: if AI misses marker, continue deterministic guided flow.
    if (updatedFormData) {
      const nextStepIndex = Math.min(fallbackStepIndex + 1, LLP_QUESTIONS.length - 1);

      if (nextStepIndex > fallbackStepIndex) {
        const nextStep = LLP_QUESTIONS[nextStepIndex];
        setCurrentStep(nextStepIndex);
        setOptions(responseOptions || nextStep.options || []);

        const needsPrompt = !cleanedText || !/[?]$/.test(cleanedText.trim());
        if (needsPrompt) {
          appendBotMessage(nextStep.question);
        }
      }
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
      await applyAssistantStep(initialText, response.options, undefined, 0);
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

      if (storedState && (storedState.completed || storedState.aiSessionId)) {
        let hydratedMessages = storedState.messages;

        if (storedState.aiSessionId) {
          try {
            const dbMessages = await fetchChatMessages(storedState.aiSessionId);
            if (dbMessages.length > 0) {
              hydratedMessages = dbMessages;
            }
          } catch (error) {
            console.warn("Failed to load messages from database, using local cache.", error);
          }
        }

        setMessages(hydratedMessages);
        setCurrentStep(storedState.currentStep);
        setAiSessionId(storedState.aiSessionId);
        setFormData(storedState.formData);
        setCompleted(storedState.completed);
        setSubmitStatus(storedState.submitStatus);
        setSubmitError(storedState.submitError);
        setOptions(storedState.completed ? [] : LLP_QUESTIONS[storedState.currentStep]?.options || []);
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

  const appendBotMessage = (text: string): void => {
    setMessages((prev) => [...prev, { sender: "bot", text }]);
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

  const normalizeAnswer = (
    field: LlpFieldKey,
    answer: string,
    existingData: Partial<LlpFormData>,
  ): { value?: LlpFormData[LlpFieldKey]; error?: string } => {
    const normalized = answer.trim();

    if (!normalized) {
      return { error: "This field is required. Please provide a valid answer." };
    }

    if (field !== "proposed_llp_name" && isLikelyOffTopicInput(normalized)) {
      return {
        error:
          "Please stay on LLP formation details. This answer seems unrelated to the current intake question.",
      };
    }

    if (field === "applicant_name") {
      if (!looksMeaningfulText(normalized, 3) || /^\d+$/.test(normalized)) {
        return { error: "Please enter a valid full name." };
      }
      return { value: normalized };
    }

    if (field === "email") {
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!validEmail.test(normalized)) {
        return { error: "Please provide a valid email address." };
      }
      return { value: normalized };
    }

    if (field === "phone") {
      if (!/^\d{10}$/.test(normalized)) {
        return { error: "Phone should be a 10 digit number." };
      }
      return { value: normalized };
    }

    if (field === "business_activity") {
      if (!looksMeaningfulText(normalized, 4)) {
        return { error: "Please describe the business activity clearly." };
      }
      return { value: normalized };
    }

    if (field === "registered_office_zip_code") {
      if (!/^[A-Za-z0-9\-\s]{4,10}$/.test(normalized)) {
        return {
          error: "ZIP/Postal code should be 4 to 10 characters (letters, numbers, spaces or -).",
        };
      }
      return { value: normalized };
    }

    if (field === "registered_office_address_line2") {
      if (normalized.toLowerCase() === "na" || normalized.toLowerCase() === "n/a") {
        return { value: "" as LlpFormData[LlpFieldKey] };
      }
      return { value: normalized as LlpFormData[LlpFieldKey] };
    }

    if (field === "total_partners" || field === "designated_partners") {
      const parsed = Number.parseInt(normalized, 10);
      if (Number.isNaN(parsed) || parsed <= 0) {
        return { error: "Please provide a valid number greater than 0." };
      }

      if (field === "designated_partners") {
        const totalPartners = Number(existingData.total_partners || 0);
        if (totalPartners > 0 && parsed > totalPartners) {
          return {
            error: "Designated partners cannot be greater than total partners.",
          };
        }
      }

      return { value: parsed as LlpFormData[LlpFieldKey] };
    }

    if (field === "capital_contribution") {
      const parsed = Number.parseFloat(normalized);
      if (Number.isNaN(parsed) || parsed <= 0) {
        return { error: "Please provide a valid contribution amount." };
      }
      return { value: parsed as LlpFormData[LlpFieldKey] };
    }

    if (field === "agreement_required") {
      const yesValues = ["yes", "y", "true"];
      const noValues = ["no", "n", "false"];
      const lower = normalized.toLowerCase();

      if (yesValues.includes(lower)) {
        return { value: true as LlpFormData[LlpFieldKey] };
      }

      if (noValues.includes(lower)) {
        return { value: false as LlpFormData[LlpFieldKey] };
      }

      return { error: "Please answer with Yes or No." };
    }

    if (field === "partner_details") {
      const partners = normalized
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (partners.length === 0) {
        return { error: "Please provide at least one partner name." };
      }

      return { value: partners as LlpFormData[LlpFieldKey] };
    }

    if (field === "notes") {
      if (normalized.toLowerCase() === "none") {
        return { value: normalized as LlpFormData[LlpFieldKey] };
      }

      if (!looksMeaningfulText(normalized, 3)) {
        return { error: "Please enter a more meaningful note or type 'None'." };
      }
    }

    return { value: normalized as LlpFormData[LlpFieldKey] };
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
      await applyAssistantStep(response.question || "", response.options, updatedFormData, currentStep);
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

    const normalized = normalizeAnswer(activeStep.field, text, formData);
    if (normalized.error) {
      const retryQuestion = activeStep.question || "Please share that detail.";
      const errorText = normalized.error;
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: errorText },
        { sender: "bot", text: retryQuestion },
      ]);
      return;
    }

    const updatedFormData = {
      ...formData,
      [activeStep.field]: normalized.value,
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
