import axios, { AxiosInstance } from "axios";
import { ChromaApiConfig, OllamaApiConfig } from "../core/config";
import {
  IChromaService,
  ChromaApiResponse,
  AppError,
  ILogger,
  DocumentChunk,
} from "../models/types";

export class ChromaService implements IChromaService {
  private httpClient: AxiosInstance;
  private logger: ILogger;

  constructor(
    private config: ChromaApiConfig,
    private ollamaConfig: OllamaApiConfig,
    logger: ILogger
  ) {
    this.logger = logger;
    this.httpClient = axios.create({
      baseURL: this.config.url,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  public async askQuestion(question: string): Promise<string> {
    try {
      this.logger.info("Sending question to Chroma API", { question });

      const response = await this.httpClient.get<ChromaApiResponse>("/search", {
        params: {
          query: question.trim(),
          limit: 20,
        },
      });

      this.logger.info("Chroma API response", {
        responseLength: response.data?.length || 0,
        firstResult: response.data?.[0]?.id || "none",
      });

      // Check if we have results
      if (
        !response.data ||
        !Array.isArray(response.data) ||
        response.data.length === 0
      ) {
        throw new AppError("No results found for your question", 404);
      }

      const chromaResponse = response.data;
      const filteredChunks = this.filterChunksByFilenameSimilarity(
        chromaResponse,
        question
      );
      const formattedResponse = this.formatChromaResponse(filteredChunks);

      if (!chromaResponse.length || !chromaResponse[0].text.trim()) {
        throw new AppError("Found result but no text content available", 400);
      }

      this.logger.info("Successfully received response from Chroma API");

      const ollamaPrompt = `
      Eres un asistente experto en planes de estudio universitarios. Usa exclusivamente la información contenida en el contexto para responder la pregunta del usuario.

      Si la respuesta está en el contexto, preséntala de forma clara, técnica y directa.

      ### Contexto del curso:
      ${formattedResponse}

      ### Pregunta del usuario:
      ${question}

      ### Instrucciones:
      - Extrae la información directamente desde el contexto, sin inventar nada.
      - Si varios fragmentos del contexto son relevantes, combínalos brevemente.
      - Si la pregunta menciona una sección (como cronograma, objetivos, etc.), busca esa sección aunque tenga un título levemente distinto.
      - No ignores partes del contexto solo por formato (ej: “Cronograma resumido” es válido como "cronograma").
      - Mantén una respuesta precisa y breve.

      - Según el análisis, la sección buscada parece ser: "${this.mapQuestionToSection(question)}"

      Respuesta:
      `;

      const ollamaResponse = await axios.post(this.ollamaConfig.url, {
        model: this.ollamaConfig.model,
        prompt: ollamaPrompt,
        stream: false,
      });

      this.logger.info("Successfully received response from Ollama");

      if (!ollamaResponse.data || !ollamaResponse.data.response) {
        throw new AppError("No response from Ollama", 500);
      }

      return ollamaResponse.data.response;
    } catch (error) {
      this.logger.error("Error calling Chroma API:", error);

      if (error instanceof AppError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          throw new AppError("Chroma API request timeout", 408);
        }

        if (error.response?.status === 404) {
          throw new AppError(
            "No matching documents found in the knowledge base",
            404
          );
        }

        if (error.response?.status) {
          throw new AppError(
            `Chroma API error: ${error.response.statusText}`,
            error.response.status
          );
        }

        if (error.request) {
          throw new AppError("Unable to reach Chroma API", 503);
        }
      }

      throw new AppError(
        "Unexpected error occurred while calling Chroma API",
        500
      );
    }
  }

  private mapQuestionToSection(question: string): string | null {
    const q = question.toLowerCase();

    const sectionKeywords: { [section: string]: string[] } = {
      "curso:": ["curso", "información del curso", "acerca del curso"],
      "código:": ["código del curso", "id del curso", "sigla"],
      "nombre completo:": ["nombre del curso", "nombre completo"],
      "tipo de curso:": [
        "tipo de curso",
        "teórico",
        "práctico",
        "teórico-práctico",
      ],
      "créditos:": ["créditos", "cuántos créditos", "valor en créditos"],
      "horas lectivas por semana:": [
        "horas lectivas",
        "horas por semana",
        "duración semanal",
      ],
      "requisitos:": ["requisitos", "previos", "materias previas"],
      "correquisitos:": [
        "correquisitos",
        "cursar junto",
        "requisitos simultáneos",
      ],
      "ubicación en el plan de estudios:": [
        "ubicación",
        "nivel",
        "ciclo",
        "plan de estudios",
      ],
      suficiencia: [
        "suficiencia",
        "se puede aplicar a suficiencia",
        "examen de suficiencia",
      ],
      tutoría: ["tutoría", "tutor", "apoyo académico"],
      "modalidad por sede y recinto:": [
        "modalidad",
        "presencial",
        "virtual",
        "bimodal",
        "sede",
        "recinto",
      ],
      "descripción del curso:": [
        "descripción",
        "de qué trata",
        "propósito del curso",
      ],
      "objetivo general:": [
        "objetivo general",
        "propósito general",
        "meta principal",
      ],
      "objetivos específicos:": [
        "objetivos específicos",
        "metas",
        "propósitos particulares",
      ],
      "contenidos del curso:": [
        "contenidos",
        "temas",
        "temario",
        "materia que se ve",
      ],
      "metodología:": [
        "metodología",
        "cómo se imparte",
        "método de enseñanza",
        "forma de impartición",
      ],
      "evaluación:": [
        "evaluación",
        "cómo se evalúa",
        "exámenes",
        "trabajos",
        "notas",
        "calificación",
      ],
      "consideraciones sobre la evaluación:": [
        "consideraciones",
        "normas",
        "reglas",
        "condiciones",
        "plagio",
        "fechas",
      ],
      "docentes:": ["docentes", "profesores", "instructores", "quién imparte"],
      "cronograma resumido:": [
        "cronograma",
        "fechas",
        "semanas",
        "actividades del curso",
        "planificación",
      ],
      "acreditación:": ["acreditación", "certificación", "sinaes", "aval"],
      "referencias obligatorias:": [
        "referencias obligatorias",
        "libros base",
        "lecturas obligatorias",
      ],
      "referencias secundarias:": [
        "referencias secundarias",
        "lecturas complementarias",
        "bibliografía adicional",
      ],
    };

    for (const [section, keywords] of Object.entries(sectionKeywords)) {
      if (keywords.some((kw) => q.includes(kw))) {
        return section;
      }
    }

    return null;
  }

  private filterChunksByFilenameSimilarity(
    chunks: DocumentChunk[],
    question: string
  ): DocumentChunk[] {
    const questionWords = this.normalizeText(question).split(/\s+/);

    return chunks.filter((chunk) => {
      const filenameText = chunk.metadata.filename
        ? this.normalizeText(chunk.metadata.filename)
        : "";
      return questionWords.some((word) => filenameText.includes(word));
    });
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD") // Descompone letras con tildes
      .replace(/[\u0300-\u036f]/g, "") // Elimina marcas de acento
      .replace(/[^a-z0-9\s]/g, "") // Elimina puntuación
      .trim();
  }

  private formatChromaResponse(response: ChromaApiResponse): string {
    return response
      .map((item, index) => {
        const filename = item.metadata?.filename;
        const chunkText = item.text.trim();
        return `[contexto: ${index + 1}]\n[${filename}]\n${chunkText}\n`;
      })
      .join("\n");
  }

  private setupInterceptors(): void {
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.info(`Making request to: ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error("Request interceptor error:", error);
        return Promise.reject(error);
      }
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.info(`Response received: ${response.status}`);
        return response;
      },
      (error) => {
        this.logger.error(
          "Response interceptor error:",
          error?.response?.status || "Unknown"
        );
        return Promise.reject(error);
      }
    );
  }
}
