// src/config.ts

// Determine a URL base da API com base no ambiente.
// Em desenvolvimento, o frontend (Vite, porta 5173) e o backend PHP (Apache/Nginx, porta 80 ou outra)
// provavelmente estarão em origens diferentes, exigindo CORS e uma URL completa.
// Em produção, o frontend buildado pode ser servido pelo mesmo servidor que o PHP,
// permitindo um caminho relativo.

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Configure esta URL para corresponder ao seu ambiente de desenvolvimento PHP.
// Exemplos:
// - Se PHP servido por Apache/Nginx na porta 80, e 'backend' está em 'htdocs/meu_projeto/backend':
//   const DEV_API_URL = 'http://localhost/meu_projeto/backend/api';
// - Se PHP servido via `php -S localhost:8000` e a pasta 'backend' é a raiz do servidor PHP:
//   const DEV_API_URL = 'http://localhost:8000/api'; (assumindo que os scripts estão em backend/api)
// - Para o projeto atual, se 'backend' está dentro da raiz do projeto Vite e é servido por um servidor Apache/Nginx
//   que tem 'file-nest-vault' como um alias ou diretório raiz:
const DEV_API_URL = 'http://localhost/file-nest-vault/backend/api'; // Ajuste conforme necessário

const PROD_API_URL = '/backend/api'; // Assume que o build do frontend está na raiz e o backend está em /backend/api

const API_BASE_URL = IS_DEVELOPMENT ? DEV_API_URL : PROD_API_URL;

export default API_BASE_URL;

/**
 * Função helper para realizar chamadas fetch para a API, incluindo credenciais.
 * @param endpoint O caminho do endpoint da API (ex: /auth/login.php)
 * @param options Opções do Fetch (method, headers, body, etc.)
 * @returns Promise<Response>
 */
export async function fetchApi(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        // Adicione outros cabeçalhos padrão se necessário
        // Ex: 'X-Requested-With': 'XMLHttpRequest' (comum em algumas configurações PHP)
    };

    const config: RequestInit = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
        credentials: 'include', // Crucial para sessões PHP baseadas em cookies
    };

    return fetch(url, config);
}

/**
 * Função helper para chamadas fetch que enviam FormData (ex: upload de arquivos).
 * @param endpoint O caminho do endpoint da API
 * @param formData Objeto FormData
 * @param options Opções adicionais do Fetch (method (geralmente POST), etc.)
 * @returns Promise<Response>
 */
export async function fetchWithFormData(endpoint: string, formData: FormData, options: RequestInit = {}): Promise<Response> {
    const url = `${API_BASE_URL}${endpoint}`;

    // Para FormData, o browser define o Content-Type automaticamente com o boundary correto.
    // Não defina 'Content-Type': 'multipart/form-data' manualmente aqui, pois pode omitir o boundary.
    const config: RequestInit = {
        ...options, // method deve ser especificado pelo chamador, geralmente 'POST'
        body: formData,
        credentials: 'include',
        // headers são intencionalmente omitidos ou apenas os necessários são adicionados
        // para permitir que o navegador defina o Content-Type para multipart/form-data corretamente.
        headers: {
            // Adicione outros cabeçalhos se necessário, mas não 'Content-Type' para FormData
            ...(options.headers || {})
        }
    };

    return fetch(url, config);
}
