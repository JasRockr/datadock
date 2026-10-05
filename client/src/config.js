const viteApiUrl = import.meta.env?.VITE_API_URL;
const configuredApiUrl = viteApiUrl && viteApiUrl !== 'undefined'
	? viteApiUrl
	: 'http://localhost:5128/api';

// Keep endpoint construction in one place so local and production builds agree.
export const API_ENDPOINT = configuredApiUrl.replace(/\/$/, '');
export const API_BASE = API_ENDPOINT.replace(/\/api$/, '');
export const host = new URL(API_BASE).hostname;
export const port = Number(new URL(API_BASE).port || 80);

// API endpoint for uploading files
export const API_ENDPOINT_UPLOAD = `${API_ENDPOINT}/upload`;
// API endpoint for getting asesores
export const API_ENDPOINT_ASESORES = `${API_ENDPOINT}/asesores`;
// Allowed file extensions for uploads
export const ALLOWED_EXTENSIONS = ['.csv'];

