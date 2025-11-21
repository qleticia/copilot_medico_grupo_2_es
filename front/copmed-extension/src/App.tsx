import {
  useState,
  useEffect,
  useCallback,
  useRef,
  Key,
  ReactNode,
} from "react";
import "./App.css";
import Chat from "./modules/Chat/chat";
import {
  executeArbitraryScriptOnActiveTab,
  executeScriptOnActiveTab,
} from "./utils/utils";
import {
  FirstAidIcon,
  RecordIcon,
  UserCirclePlusIcon,
} from "@phosphor-icons/react";

const SERVER_URL = "http://localhost:3001";

// --- Tipos ---
type Message = {
  id: Key;
  text: ReactNode;
  sender: "user" | "bot";
  timestamp: string;
};

type PatientListItem = {
  id: string;
  name: string;
};

type ConsultationListItem = {
  id: string;
  title: string;
  date: string;
};

// --- Componente Principal App ---
function App() {
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [_, setConsultationTitle] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [allPatients, setAllPatients] = useState<PatientListItem[]>([]);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [debugMode, setDebugMode] = useState(false);
  const [selectorInput, setSelectorInput] = useState("");
  const [selectorResult, setSelectorResult] = useState("");

  const [patientConsultations, setPatientConsultations] = useState<
    ConsultationListItem[]
  >([]);
  const [selectedConsultationIdsToImport, setSelectedConsultationIdsToImport] =
    useState<string[]>([]);
  const [showImportHistoryModal, setShowImportHistoryModal] = useState(false);

  // --- Funções de Carregamento e Persistência ---

  const loadPatientDataFromStorage = useCallback(() => {
    chrome.storage.local.get(
      ["patientId", "patientName", "consultationId", "consultationTitle"],
      (result) => {
        if (result.patientId) {
          setPatientId(result.patientId);
          setPatientName(result.patientName || null);
          setConsultationId(result.consultationId || null);
          setConsultationTitle(result.consultationTitle || null);
        }
      }
    );
  }, []); // Dependências vazias

  const loadConsultationHistory = useCallback(
    async (pId: string, cId: string) => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${SERVER_URL}/api/patients/${pId}/consultations/${cId}/history`
        );
        const data = await response.json();
        if (data.status === "success") {
          const loadedMessages: Message[] = data.history.map(
            (msg: any, index: number) => ({
              id: `${msg.timestamp}-${index}-${Math.random()}`, // IDs mais robustos para garantir unicidade
              text: msg.parts && msg.parts.length > 0 ? msg.parts[0].text : "",
              sender: msg.role === "user" ? "user" : "bot", // Garante 'user' ou 'bot'
              timestamp: msg.timestamp,
            })
          );
          setMessages(loadedMessages);
        } else {
          console.error(
            "Erro ao carregar histórico da consulta:",
            data.message
          );
          setMessages([
            {
              id: Date.now(),
              text: `Erro ao carregar histórico: ${data.message}`,
              sender: "bot",
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } catch (error: any) {
        console.error("Erro de rede ao carregar histórico:", error);
        setMessages([
          {
            id: Date.now(),
            text: `Erro de rede ao carregar histórico: ${error.message}`,
            sender: "bot",
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  ); // Dependências vazias, `setMessages` e `setIsLoading` são estáveis

  const fetchAllPatients = useCallback(async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/all-patients`);
      const data = await response.json();
      if (data.status === "success") {
        setAllPatients(data.patients);
      } else {
        console.error("Erro ao buscar todos os pacientes:", data.message);
      }
    } catch (error) {
      console.error("Erro de rede ao buscar todos os pacientes:", error);
    }
  }, []); // Dependências vazias, `setAllPatients` é estável

  const fetchPatientConsultations = useCallback(async (pId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${SERVER_URL}/api/patients/${pId}/consultations`
      );
      const data = await response.json();
      if (data.status === "success") {
        const sortedConsultations = data.consultations.sort(
          (a: ConsultationListItem, b: ConsultationListItem) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setPatientConsultations(sortedConsultations);
      } else {
        console.error("Erro ao carregar consultas:", data.message);

        setPatientConsultations([
          {
            id: Date.now().toString(),
            title: `Erro ao carregar consultas: ${data.message}`,
            date: new Date().toISOString(),
          },
        ]);
      }
    } catch (error: any) {
      console.error("Erro na requisição de consultas:", error);
      setPatientConsultations([
        {
          id: Date.now().toString(),
          title: `Erro de rede ao carregar consultas: ${error.message}`,
          date: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []); // Dependências vazias, `setPatientConsultations` e `setIsLoading` são estáveis

  // Carrega dados do paciente e todas as listas de pacientes na inicialização
  useEffect(() => {
    loadPatientDataFromStorage();
    fetchAllPatients();
  }, [loadPatientDataFromStorage, fetchAllPatients]);

  // Carrega o histórico da consulta quando patientId ou consultationId mudam

  useEffect(() => {
    if (patientId && consultationId) {
      loadConsultationHistory(patientId, consultationId);
    } else {
      // Limpa as mensagens ou exibe a mensagem de boas-vindas
      setMessages([
        {
          id: Date.now(),
          text: "Bem-vindo! Selecione ou crie um paciente para começar.",
          sender: "bot",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [patientId, consultationId]);

  // Carrega as consultas do paciente quando o patientId muda
  useEffect(() => {
    if (patientId) {
      fetchPatientConsultations(patientId);
    } else {
      setPatientConsultations([]);
    }
  }, [patientId]);

  // --- Handlers de Ação ---

  const handleSendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || !patientId || !consultationId) return;

      const userMessage: Message = {
        id: Date.now(),
        text: messageText,
        sender: "user",
        timestamp: new Date().toISOString(),
      };
      setMessages((prevMessages) => [...prevMessages, userMessage]); // Adiciona mensagem do usuário imediatamente
      setIsLoading(true);

      try {
        const response = await fetch(`${SERVER_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: messageText,
            patient_id: patientId,
            consultation_id: consultationId,
          }),
        });

        const data = await response.json();
        if (data.status === "success") {
          // Após o envio bem-sucedido, recarrega o histórico completo para sincronizar com o backend
          if (patientId && consultationId) {
            await loadConsultationHistory(patientId, consultationId);
          }

          // Atualiza patientId/consultationId se o backend retornar novos (caso de primeira conversa)
          if (data.patient_id && data.patient_id !== patientId) {
            setPatientId(data.patient_id);
            chrome.storage.local.set({ patientId: data.patient_id });
          }
          if (data.consultation_id && data.consultation_id !== consultationId) {
            setConsultationId(data.consultation_id);
            chrome.storage.local.set({ consultationId: data.consultation_id });
          }
        } else {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: Date.now(),
              text: `Erro: ${data.message}`,
              sender: "bot",
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } catch (error: any) {
        console.error("Erro de rede:", error);
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: Date.now(),
            text: `Erro de conexão: ${error.message}`,
            sender: "bot",
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [patientId, consultationId, loadConsultationHistory]
  );

  const handleUploadPdf = useCallback(
    async (file: File) => {
      if (!file || !patientId || !consultationId) return;

      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("patient_id", patientId);
      formData.append("consultation_id", consultationId);

      setIsLoading(true);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: `Analisando PDF "${file.name}"...`,
          sender: "bot",
          timestamp: new Date().toISOString(),
        },
      ]);

      try {
        const response = await fetch(`${SERVER_URL}/api/upload-pdf`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (data.status === "success") {
          // Após o upload bem-sucedido, recarrega o histórico completo para sincronizar com o backend
          if (patientId && consultationId) {
            await loadConsultationHistory(patientId, consultationId);
          }

          if (data.patient_id && data.patient_id !== patientId) {
            setPatientId(data.patient_id);
            chrome.storage.local.set({ patientId: data.patient_id });
          }
          if (data.consultation_id && data.consultation_id !== consultationId) {
            setConsultationId(data.consultation_id);
            chrome.storage.local.set({ consultationId: data.consultation_id });
          }
        } else {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: Date.now(),
              text: `Erro ao processar PDF: ${data.message}`,
              sender: "bot",
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } catch (error: any) {
        console.error("Erro de rede no upload de PDF:", error);
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: Date.now(),
            text: `Erro de conexão ao enviar PDF: ${error.message}`,
            sender: "bot",
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [patientId, consultationId, loadConsultationHistory]
  ); // Adicionado loadConsultationHistory como dependência

  const handleCreateNewPatient = useCallback(async () => {
    if (!newPatientName.trim()) {
      alert("Por favor, insira um nome para o paciente.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPatientName }),
      });
      const data = await response.json();

      if (data.status === "success") {
        const newPId = data.patient_id;
        const newPName = data.patient_name;
        const newCId = data.first_consultation_id;

        chrome.storage.local.set(
          {
            patientId: newPId,
            patientName: newPName,
            consultationId: newCId,
            consultationTitle: "Primeira Consulta",
          },
          () => {
            console.log(
              "Setting patientId to:",
              newPId,
              "and consultationId to:",
              newCId
            );
            setPatientId(newPId);
            setPatientName(newPName);
            setConsultationId(newCId);
            setConsultationTitle("Primeira Consulta");
            loadConsultationHistory(newPId, newCId);
            fetchAllPatients(); // O fetchAllPatients() é importante para atualizar a lista na sidebar
          }
        );
        setShowNewPatientModal(false);
        setNewPatientName("");
      } else {
        alert(`Erro ao criar paciente: ${data.message}`);
      }
    } catch (error: any) {
      console.error("Erro ao criar paciente:", error);
      alert(`Erro de rede ao criar paciente: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [newPatientName, fetchAllPatients, loadConsultationHistory]);

  const handleSelectPatient = useCallback(
    async (pId: string, pName: string) => {
      setIsLoading(true);
      try {
        const consultationsResponse = await fetch(
          `${SERVER_URL}/api/patients/${pId}/consultations`
        );
        const consultationsData = await consultationsResponse.json();

        let selectedConsultationToLoad: string | null = null;
        let selectedConsultationTitleToLoad: string | null = null;

        if (
          consultationsData.status === "success" &&
          consultationsData.consultations.length > 0
        ) {
          const sortedConsults = consultationsData.consultations.sort(
            (a: ConsultationListItem, b: ConsultationListItem) =>
              new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          selectedConsultationToLoad = sortedConsults[0].id;
          selectedConsultationTitleToLoad = sortedConsults[0].title;
        } else {
          const createConsultationResponse = await fetch(
            `${SERVER_URL}/api/patients/${pId}/consultations`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: `Consulta Padrão - ${new Date().toLocaleDateString(
                  "pt-BR"
                )}`,
              }),
            }
          );
          const createConsultationData =
            await createConsultationResponse.json();
          if (createConsultationData.status === "success") {
            selectedConsultationToLoad = createConsultationData.consultation_id;
            selectedConsultationTitleToLoad =
              createConsultationData.consultation_title;
          } else {
            throw new Error(
              `Falha ao criar consulta para paciente selecionado: ${createConsultationData.message}`
            );
          }
        }

        if (selectedConsultationToLoad) {
          chrome.storage.local.set(
            {
              patientId: pId,
              patientName: pName,
              consultationId: selectedConsultationToLoad,
              consultationTitle: selectedConsultationTitleToLoad,
            },
            () => {
              setPatientId(pId);
              setPatientName(pName);
              setConsultationId(selectedConsultationToLoad);
              setConsultationTitle(selectedConsultationTitleToLoad);
              loadConsultationHistory(pId, selectedConsultationToLoad);
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now(),
                  text: `Paciente "${pName}" (${pId.substring(
                    0,
                    8
                  )}...) selecionado. Consulta "${selectedConsultationTitleToLoad}" carregada.`,
                  sender: "bot",
                  timestamp: new Date().toISOString(),
                },
              ]);
            }
          );
        }
      } catch (error: any) {
        console.error("Erro ao selecionar paciente:", error);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: `Erro ao selecionar paciente: ${error.message}`,
            sender: "bot",
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
        setIsSidebarOpen(false); // Fecha o sidebar após seleção
      }
    },
    [loadConsultationHistory]
  );

  const handleSelectConsultation = useCallback(
    async (cId: string, cTitle: string) => {
      if (!patientId) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: "Nenhum paciente selecionado. Por favor, selecione um paciente primeiro.",
            sender: "bot",
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }
      setIsLoading(true);
      chrome.storage.local.set(
        { consultationId: cId, consultationTitle: cTitle },
        () => {
          setConsultationId(cId);
          setConsultationTitle(cTitle);
          loadConsultationHistory(patientId, cId);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now(),
              text: `Consulta "${cTitle}" (${cId.substring(
                0,
                8
              )}...) carregada.`,
              sender: "bot",
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      );
      setIsSidebarOpen(false); // Fecha o sidebar após seleção
    },
    [patientId, loadConsultationHistory]
  );

  const handleCreateNewConsultation = useCallback(async () => {
    if (!patientId) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: "Por favor, selecione ou crie um paciente primeiro.",
          sender: "bot",
          timestamp: new Date().toISOString(),
        },
      ]);
      return;
    }

    setIsLoading(true);
    try {
      const newConsultationTitle = `Consulta em ${new Date().toLocaleDateString(
        "pt-BR"
      )} ${new Date().toLocaleTimeString("pt-BR")}`;
      const response = await fetch(
        `${SERVER_URL}/api/patients/${patientId}/consultations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: newConsultationTitle,
            import_consultation_ids: selectedConsultationIdsToImport,
          }),
        }
      );
      const data = await response.json();

      if (data.status === "success") {
        const newConsultId = data.consultation_id;
        const newConsultTitle = data.consultation_title;

        chrome.storage.local.set(
          {
            consultationId: newConsultId,
            consultationTitle: newConsultTitle,
            patientId: patientId,
          },
          () => {
            setConsultationId(newConsultId);
            setConsultationTitle(newConsultTitle);
            loadConsultationHistory(patientId, newConsultId);
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now(),
                text: `Nova consulta "${newConsultTitle}" criada e selecionada.`,
                sender: "bot",
                timestamp: new Date().toISOString(),
              },
            ]);

            setSelectedConsultationIdsToImport([]);
            fetchPatientConsultations(patientId); // Atualiza a lista de consultas na sidebar
          }
        );
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: `Erro ao criar nova consulta: ${data.message}`,
            sender: "bot",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error: any) {
      console.error("Erro ao criar nova consulta:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: `Erro de rede ao criar nova consulta: ${error.message}`,
          sender: "bot",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setShowImportHistoryModal(false); // Fecha o modal após a criação
    }
  }, [
    patientId,
    selectedConsultationIdsToImport,
    loadConsultationHistory,
    fetchPatientConsultations,
  ]);

  const handleSendExtractedDataToServer = useCallback(
    async (extractedData: Record<string, string | string[]>) => {
      if (!patientId || !consultationId) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: "Por favor, selecione ou crie um paciente e uma consulta primeiro.",
            sender: "bot",
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }

      setIsLoading(true);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: "Enviando dados extraídos para análise...",
          sender: "bot",
          timestamp: new Date().toISOString(),
        },
      ]);

      try {
        const response = await fetch(`${SERVER_URL}/api/extracted-data`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patient_id: patientId,
            consultation_id: consultationId,
            extracted_data: extractedData,
          }),
        });

        const data = await response.json();
        if (data.status === "success") {
          // Após o envio bem-sucedido, recarrega o histórico completo para sincronizar com o backend
          if (patientId && consultationId) {
            await loadConsultationHistory(patientId, consultationId);
          }
        } else {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: Date.now(),
              text: `Erro ao enviar dados extraídos: ${data.message}`,
              sender: "bot",
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } catch (error: any) {
        console.error("Erro de rede ao enviar dados extraídos:", error);
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: Date.now(),
            text: `Erro de conexão ao enviar dados extraídos: ${error.message}`,
            sender: "bot",
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [patientId, consultationId, loadConsultationHistory]
  );

  const handleExtractAndSend = useCallback(async () => {
    if (!patientId || !consultationId) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: "Por favor, selecione um paciente e uma consulta primeiro para extrair dados.",
          sender: "bot",
          timestamp: new Date().toISOString(),
        },
      ]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: "Extraindo dados da página...",
        sender: "bot",
        timestamp: new Date().toISOString(),
      },
    ]);
    setIsLoading(true);

    try {
      const editableNotesSelector = ".editable-notes";
      const createInputsSelector = ".create-input";

      const extractedContent = await executeArbitraryScriptOnActiveTab(
        (notesSel: string, inputsSel: string) => {
          const extractText = (selector: string) => {
            const element = document.querySelector(selector);
            return element ? element.textContent?.trim() || "" : "";
          };

          const extractInputs = (selector: string) => {
            const elements = Array.from(
              document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
                selector
              )
            );
            return elements.map(
              (el) =>
                `${el.name || el.id || el.placeholder || "Campo"}: ${
                  el.value || ""
                }`
            );
          };

          const editableNotes = extractText(notesSel);
          const createInputs = extractInputs(inputsSel);

          return { editableNotes, createInputs };
        },
        editableNotesSelector,
        createInputsSelector
      );

      if (extractedContent) {
        await handleSendExtractedDataToServer(extractedContent);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: "Nenhum conteúdo relevante extraído da página.",
            sender: "bot",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error: any) {
      console.error("Erro ao extrair dados da página:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: `Erro ao extrair dados: ${error.message}`,
          sender: "bot",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, consultationId, handleSendExtractedDataToServer]);

  const handleDebugSelector = useCallback(async () => {
    if (!selectorInput.trim()) {
      setSelectorResult("Por favor, insira um seletor CSS.");
      return;
    }

    try {
      const result = await executeScriptOnActiveTab(selectorInput, 0);
      setSelectorResult(
        result || "Nenhum elemento encontrado com este seletor."
      );
    } catch (error: any) {
      setSelectorResult(`Erro ao executar seletor: ${error.message}`);
    }
  }, [selectorInput]);

// --- gravação do áudio ---
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isLoopingRef = useRef<boolean>(false);

  // Ref para controlar o timer de corte e evitar sobreposição
  const stopTimerRef = useRef<number | null>(null);

  // ---  Helper functions para conversão de áudio ---
  const audioBufferToWavBlob = useCallback((audioBuffer: AudioBuffer) => {
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels: Float32Array[] = [];
    for (let i = 0; i < numOfChan; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }
    /* RIFF identifier */ writeString(view, 0, "RIFF");
    /* file length */ view.setUint32(4, 36 + audioBuffer.length * numOfChan * 2, true);
    /* RIFF type */ writeString(view, 8, "WAVE");
    /* format chunk identifier */ writeString(view, 12, "fmt ");
    /* format chunk length */ view.setUint32(16, 16, true);
    /* sample format (raw) */ view.setUint16(20, 1, true);
    /* channel count */ view.setUint16(22, numOfChan, true);
    /* sample rate */ view.setUint32(24, audioBuffer.sampleRate, true);
    /* byte rate */ view.setUint32(28, audioBuffer.sampleRate * numOfChan * 2, true);
    /* block align */ view.setUint16(32, numOfChan * 2, true);
    /* bits per sample */ view.setUint16(34, 16, true);
    /* data chunk identifier */ writeString(view, 36, "data");
    /* data chunk length */ view.setUint32(40, audioBuffer.length * numOfChan * 2, true);
    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numOfChan; channel++) {
        let sample = Math.max(-1, Math.min(1, channels[channel][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }
    return new Blob([view], { type: "audio/wav" });
  }, []);

  const writeString = (view: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // --- Envio do áudio para o servidor ---
  const sendAudioToServer = useCallback(
    async (wavBlob: Blob) => {
      try {
        const form = new FormData();
        const file = new File([wavBlob], "recording.wav", { type: "audio/wav" });
        form.append("audio_file", file);

        const resp = await fetch(`${SERVER_URL}/api/transcribe_audio`, {
          method: "POST",
          body: form,
        });

        if (!resp.ok) {
          console.error("Erro no envio do áudio:", resp.statusText);
          return;
        }

        const data = await resp.json();

        // Caso o backend retornar uma mensagem de erro de entendimento, a mensagem é ignorada e não é enviada para o chat
        const invalidPhrases = [
            "Não foi possível entender o áudio",
            "Não foi possível entender o áudio.",
            "Erro na API de reconhecimento de fala"
        ];

        if (data && data.transcription) {
            const texto = String(data.transcription).trim();

            // Verifica se o texto é uma das frases de erro
            const ehErro = invalidPhrases.some(phrase => texto.includes(phrase));

            if (!ehErro && texto.length > 0) {
                await handleSendMessage(texto);
            } else {
                console.log("Silêncio ou áudio incompreensível detectado. Ignorando envio ao chat.");
            }
        }
      } catch (err) {
        console.error("Erro ao enviar áudio para o servidor:", err);
      }
    },
    [handleSendMessage]
  );

  // --- Processamento ---
  const processAndSendAudio = useCallback(async (blob: Blob) => {
    if (blob.size < 1000) return;

    try {
      const arrayBuffer = await blob.arrayBuffer();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const wavBlob = audioBufferToWavBlob(decodedBuffer);

      // Envia o áudio ao servidor e espera (com o filtro de silêncio aplicado dentro)
      await sendAudioToServer(wavBlob);

      if (audioCtx.state !== 'closed') await audioCtx.close();
    } catch (err) {
      console.error("Erro ao processar áudio:", err);
    }
  }, [audioBufferToWavBlob, sendAudioToServer]);


  // --- Ciclo de Gravação ---
  const startRecordingCycle = useCallback(async () => {
    // Verificação de segurança: Se já estiver gravando ou processando o áudio, ABORTA.
    if (isProcessing) return;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        console.warn("Tentativa de iniciar gravação duplicada impedida.");
        return;
    }

    try {
      console.log("🔄 Iniciando ciclo...");

      // Limpa timer anterior se existir "fantasma"
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);

      // Refresh do Stream
      if (streamRef.current) {
         streamRef.current.getTracks().forEach(t => t.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
         throw new Error("Microfone não suportado.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        console.log("⏹️ Processando...");
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];

        // Limpeza Total
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        mediaRecorderRef.current = null; // Garante que o ref esteja limpo

        setIsProcessing(true);
        setIsRecording(false);

        // Envia o áudio(caso o áudio seja silêncioso, o sendAudioToServer ignora o chat)
        await processAndSendAudio(blob);

        setIsProcessing(false);

        // Só reinicia se o usuário ainda quiser
        if (isLoopingRef.current) {
             // Timeout pequeno para garantir que o state 'recording' limpou
             setTimeout(() => startRecordingCycle(), 300);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      isLoopingRef.current = true;

      // Timer seguro guardado na Ref
      stopTimerRef.current = setTimeout(() => {
         if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
             mediaRecorderRef.current.stop();
         }
      }, 7000); // 7 segundos

      } catch (err: any) {
        console.error("Falha crítica no ciclo de gravação:", err);

        // Para tudo imediatamente
        setIsRecording(false);
        setIsProcessing(false);
        isLoopingRef.current = false; // Impede reinício automático


        let userMessage = "Ocorreu um erro ao tentar gravar o áudio.";

        // Tratamento específico de erros de Áudio/WebRTC
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            userMessage = "Permissão de microfone negada. Por favor, clique no ícone de cadeado/configurações do navegador e permita o acesso.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            userMessage = "Nenhum microfone foi encontrado no sistema. Verifique a conexão.";
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
            userMessage = "O microfone está sendo usado por outro aplicativo ou está com defeito.";
        } else if (err.message === "Microfone não suportado.") {
            userMessage = "Seu navegador não suporta gravação de áudio. Tente usar o Chrome, Firefox ou Edge atualizados.";
        }

        // Envia mensagem para o chat avisando o usuário
        setMessages((prev) => [
            ...prev,
            {
                id: Date.now(),
                text: `${userMessage}`,
                sender: "bot",
                timestamp: new Date().toISOString()
            }
        ]);
        }
    }, [processAndSendAudio, setMessages, isProcessing]); // Dependências


  // --- Parada Manual ---
  const stopManual = useCallback(() => {
      console.log("🛑 Parada manual.");
      isLoopingRef.current = false; // Trava reinício

      if (stopTimerRef.current) clearTimeout(stopTimerRef.current); // Mata o timer automático

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
      } else {
          // Se não estiver gravando (estava processando), força o estado visual
          setIsRecording(false);
          setIsProcessing(false);
      }

      if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
      }
  }, []);

  // --- useEffect Inicial ---
  useEffect(() => {
    if (consultationId && !isRecording && !isProcessing) {
      // Delay de segurança inicial
      const timer = setTimeout(() => {
          // Verificação extra antes de iniciar
          if (!isLoopingRef.current) startRecordingCycle();
      }, 1000);
      return () => clearTimeout(timer);
    }

    return () => {
        isLoopingRef.current = false;
        if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [consultationId, startRecordingCycle]); // Dependências limpas

  /* As funções abaixo serão usadas no futuro para controlar a gravação
  const stopAudioRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    } catch (err) {
      console.error('Erro ao parar gravação:', err);
    }
  }, [isRecording]);

  const pauseAudioRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.pause();
      }
    } catch (err) {
      console.error('Erro ao pausar gravação:', err);
    }
  }, [isRecording]);

  const resumeAudioRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current && !isRecording) {
        mediaRecorderRef.current.resume();
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Erro ao retomar gravação:', err);
    }
  }, [isRecording]);
  */

  // --- Renderização ---

  return (
    <div className="App">
      <header className="App-header">
        <h1>Copilot Médico</h1>
        <FirstAidIcon weight="fill" size={32} />
      </header>

      {/* Sidebar */}
      <div
        className={`sidebar ${isSidebarOpen ? "open" : ""}`}
        style={{ borderBottom: "1px solid #ccc" }}
      >
        <h2>Pacientes</h2>

        <div className="new-patient-div">
          {/* DROPDOWN DE PACIENTES */}
          <select
            className="patient-select"
            value={patientId || ""} // Define o valor selecionado
            onChange={(e) => {
              const selectedPatient = allPatients.find(
                (p) => p.id === e.target.value
              );
              if (selectedPatient) {
                handleSelectPatient(selectedPatient.id, selectedPatient.name);
              } else {
                // Se nenhuma opção for selecionada (ex: a opção "Selecione um paciente"), limpa o estado
                setPatientId(null);
                setPatientName(null);
                setConsultationId(null);
                setConsultationTitle(null);
                setMessages([
                  {
                    id: Date.now(),
                    text: "Nenhum paciente selecionado.",
                    sender: "bot",
                    timestamp: new Date().toISOString(),
                  },
                ]);
              }
            }}
            disabled={isLoading}
          >
            <option value="">Selecione um Paciente</option>
            {allPatients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name} ({patient.id.substring(0, 8)}...)
              </option>
            ))}
          </select>

          <div className="patient-controls">
            <button
              className="btn-green small"
              onClick={() => setShowNewPatientModal(true)}
              disabled={isLoading}
            >
              <UserCirclePlusIcon size={21} weight="fill" />
            </button>
          </div>
        </div>

        {patientId && (
          <>
            <h2>Paciente: {patientName || patientId.substring(0, 8)}</h2>
            <div className="consultation-controls">
              <button
                className="btn-white"
                onClick={() => setShowImportHistoryModal(true)}
                disabled={isLoading}
                style={{ marginRight: "5px" }}
              >
                Importar Consulta
              </button>
              <button
                className="btn-green"
                onClick={() => {
                  setSelectedConsultationIdsToImport([]);
                  handleCreateNewConsultation();
                }}
                disabled={isLoading}
              >
                Nova Consulta
              </button>
            </div>

            {/* DROPDOWN DE CONSULTAS */}
            <select
              className="patient-select"
              value={consultationId || ""} // Define o valor selecionado
              onChange={(e) => {
                const selectedConsultation = patientConsultations.find(
                  (c) => c.id === e.target.value
                );
                if (selectedConsultation) {
                  handleSelectConsultation(
                    selectedConsultation.id,
                    selectedConsultation.title
                  );
                } else {
                  // Se nenhuma opção for selecionada, limpa o estado da consulta
                  setConsultationId(null);
                  setConsultationTitle(null);
                  setMessages([
                    {
                      id: Date.now(),
                      text: "Nenhuma consulta selecionada para o paciente atual.",
                      sender: "bot",
                      timestamp: new Date().toISOString(),
                    },
                  ]);
                }
              }}
              disabled={isLoading || patientConsultations.length === 0}
            >
              <option value="">Selecione uma Consulta</option>
              {patientConsultations.map((consultation) => (
                <option key={consultation.id} value={consultation.id}>
                  {consultation.title} ({consultation.id.substring(0, 8)}...)
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      {/* <button
        className="btn-white"
        onClick={() => {
          chrome.tabs.create({
            url: chrome.runtime.getURL("index.html"),
          });
        }}
        style={{ fontSize: "0.8rem", padding: "5px 10px", marginTop: "8px" }}
      >
        Abrir em aba (conceder microfone)
      </button> */}

      {consultationId && (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      marginTop: "10px",
      justifyContent: "space-between",
      padding: "0 10px",
    }}
  >
    {/* --- Área dos Indicadores (Ouvindo vs Processando) --- */}
    <div>
      {isProcessing ? (
        // Estado 1: Microfone pausado, aguardando resposta do servidor
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <label style={{ color: "orange", fontWeight: "bold" }}>
            ⏳ Processando resposta...
          </label>
        </div>
      ) : isRecording ? (
        // Estado 2: Microfone aberto, gravando áudio
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <span>
            <RecordIcon size={20} weight="fill" color="#e66060" />
          </span>
          <label style={{ color: "#e66060", fontWeight: "bold" }}>
            Ouvindo...
          </label>
        </div>
      ) : null}
    </div>

    {/* --- Botão de Parar --- */}
    <button
      onClick={stopManual}
      style={{
        padding: "8px 12px",
        backgroundColor: "#e66060",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        // O botão fica ativo se estiver gravando OU processando
        opacity: (isRecording || isProcessing) ? 1 : 0.5,
        pointerEvents: (isRecording || isProcessing) ? 'auto' : 'none'
      }}
    >
      Parar gravação
    </button>
  </div>
)}
      {/* Main Chat Area */}
      <div className="chat-container">
        {/* O COMPONENTE CHAT AGORA RECEBE AS FUNÇÕES DE ENVIO E UPLOAD */}
        <Chat
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          onUploadPdf={handleUploadPdf}
        />
      </div>

      <div>
        {/* Debug Mode Toggle */}
        <div style={{ marginTop: "10px", textAlign: "center" }}>
          <label>
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
            />
            Modo Debug
          </label>
        </div>
        {/* Debug Controls */}
        {debugMode && (
          <div
            style={{
              borderTop: "1px solid #eee",
              marginTop: "10px",
              paddingTop: "10px",
            }}
          >
            <h3>Debug Seletor CSS</h3>
            <input
              type="text"
              placeholder="Ex: .some-class div > span"
              value={selectorInput}
              onChange={(e) => setSelectorInput(e.target.value)}
              style={{ width: "calc(100% - 70px)", marginRight: "5px" }}
            />
            <button onClick={handleDebugSelector}>Testar</button>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                maxHeight: "150px",
                overflowY: "auto",
                border: "1px solid #ddd",
                padding: "5px",
                background: "#f9f9f9",
                marginTop: "5px",
              }}
            >
              {selectorResult}
            </pre>
          </div>
        )}
        {/* Botão de Extrair Dados da Página (mantido no App.tsx por ser uma funcionalidade "global") */}
        <button
          onClick={handleExtractAndSend}
          disabled={isLoading || !patientId || !consultationId}
          style={{ marginTop: "10px", padding: "10px", width: "100%" }}
        >
          Extrair Dados da Página
        </button>

        {/* Botão de Extrair Dados da gravação */}

        <button
          onClick={() => {}}
          disabled={isLoading || !patientId || !consultationId}
          className="btn-white"
          style={{ marginTop: "10px", padding: "10px", width: "100%" }}
        >
          Extrair Dados da Gravação
        </button>
      </div>

      {/* Modal para Criar Novo Paciente */}
      {showNewPatientModal && (
        <div className="modal">
          <div className="new-patient-modal">
            <h3>Criar Novo Paciente</h3>
            <input
              type="text"
              placeholder="Nome do Paciente"
              value={newPatientName}
              onChange={(e) => setNewPatientName(e.target.value)}
              style={{
                width: "calc(100% - 20px)",
                marginBottom: "10px",
                padding: "8px",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                onClick={() => setShowNewPatientModal(false)}
                style={{
                  padding: "8px 15px",
                  cursor: "pointer",
                  backgroundColor: "#D9D9D9",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNewPatient}
                disabled={isLoading}
                style={{
                  padding: "8px 15px",
                  cursor: "pointer",
                  backgroundColor: "#336B29",
                  color: "white",
                }}
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para seleção de históricos de consulta para importação */}
      {showImportHistoryModal && patientId && (
        <div className="modal">
          <div className="history-import-modal">
            <h3 style={{ marginTop: "0" }}>
              Selecionar Históricos para Nova Consulta
            </h3>
            <p>
              Marque os históricos de consultas anteriores que você deseja
              importar para a nova conversa.
            </p>

            {patientConsultations.length === 0 ? (
              <p>Nenhuma consulta anterior encontrada para este paciente.</p>
            ) : (
              <div style={{ marginBottom: "15px" }}>
                {patientConsultations.map(
                  (consultation) =>
                    // Garante que a consulta atualmente selecionada não apareça para importação
                    consultation.id !== consultationId && (
                      <div
                        key={consultation.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <input
                          type="checkbox"
                          id={`consultation-${consultation.id}`}
                          checked={selectedConsultationIdsToImport.includes(
                            consultation.id
                          )}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedConsultationIdsToImport((prev) => [
                                ...prev,
                                consultation.id,
                              ]);
                            } else {
                              setSelectedConsultationIdsToImport((prev) =>
                                prev.filter((id) => id !== consultation.id)
                              );
                            }
                          }}
                          style={{ marginRight: "10px" }}
                        />
                        <label
                          htmlFor={`consultation-${consultation.id}`}
                          style={{ flexGrow: 1, cursor: "pointer" }}
                        >
                          <strong>{consultation.title}</strong>
                          <br />
                          <small>
                            ID: {consultation.id.substring(0, 8)}... - Criada
                            em:{" "}
                            {new Date(consultation.date).toLocaleDateString(
                              "pt-BR"
                            )}
                          </small>
                        </label>
                      </div>
                    )
                )}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                onClick={() => {
                  setSelectedConsultationIdsToImport([]);
                  setShowImportHistoryModal(false);
                }}
                style={{
                  padding: "8px 15px",
                  cursor: "pointer",
                  backgroundColor: "#D9D9D9",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handleCreateNewConsultation();
                }}
                disabled={isLoading}
                style={{
                  padding: "8px 15px",
                  cursor: "pointer",
                  backgroundColor: "#336B29",
                  color: "white",
                }}
              >
                Criar Nova Consulta com Histórico(s)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
