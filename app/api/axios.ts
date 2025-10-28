import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios'

// Standard API Response Interface
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  errors?: string[]
  timestamp?: string
}

// Standard API Error Response Interface
export interface ApiError {
  success: false
  message: string
  errors?: string[]
  statusCode?: number
  timestamp?: string
}

// Axios Instance with interceptors
class ApiClient {
  private axiosInstance: AxiosInstance

  constructor(baseURL?: string) {
    this.axiosInstance = axios.create({
      baseURL: baseURL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api',
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request Interceptor
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Add auth token if available
        const token = this.getAuthToken()
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // Log request in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
            params: config.params,
            data: config.data,
          })
        }

        return config
      },
      (error: AxiosError) => {
        console.error('❌ Request Error:', error)
        return Promise.reject(error)
      }
    )

    // Response Interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse<any>) => {
        // Log response in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Response: ${response.config.url}`, response.data)
        }

        // Transform response to standard format
        if (response.data.success !== undefined) {
          response.data = response.data as ApiResponse
        } else {
          // Handle non-standard response format (wrap it)
          response.data = {
            success: true,
            data: response.data,
            message: 'Request successful',
          }
        }

        return response
      },
      (error: AxiosError<ApiError>) => {
        return this.handleError(error)
      }
    )
  }

  private handleError(error: AxiosError<ApiError>): Promise<never> {
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
      })
    }

    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const errorData = error.response.data
      const apiError: ApiError = {
        success: false,
        message: errorData?.message || error.message || 'An error occurred',
        errors: errorData?.errors || [],
        statusCode: error.response.status,
        timestamp: new Date().toISOString(),
      }

      return Promise.reject(apiError)
    } else if (error.request) {
      // Request was made but no response received
      const apiError: ApiError = {
        success: false,
        message: 'Network error. Please check your internet connection.',
        statusCode: 0,
        timestamp: new Date().toISOString(),
      }

      return Promise.reject(apiError)
    } else {
      // Something else happened
      const apiError: ApiError = {
        success: false,
        message: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
      }

      return Promise.reject(apiError)
    }
  }

  private getAuthToken(): string | null {
    // Try to get token from localStorage or cookies
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
    }
    return null
  }

  public setAuthToken(token: string | null) {
    if (token) {
      localStorage.setItem('auth_token', token)
      this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      localStorage.removeItem('auth_token')
      sessionStorage.removeItem('auth_token')
      delete this.axiosInstance.defaults.headers.common['Authorization']
    }
  }

  public getAuthTokenFromStorage(): string | null {
    return this.getAuthToken()
  }

  // HTTP Methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.get(url, config)
    return response.data
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.post(url, data, config)
    return response.data
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.put(url, data, config)
    return response.data
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.patch(url, data, config)
    return response.data
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.delete(url, config)
    return response.data
  }

  // Method to upload files
  async uploadFile<T = any>(
    url: string,
    file: File,
    onUploadProgress?: (progressEvent: any) => void,
    additionalData?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)
    
    if (additionalData) {
      Object.keys(additionalData).forEach((key) => {
        formData.append(key, additionalData[key])
      })
    }

    const response = await this.axiosInstance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    })
    return response.data
  }

  // Method to download files
  async downloadFile(url: string, filename?: string): Promise<void> {
    const response = await this.axiosInstance.get(url, {
      responseType: 'blob',
    })

    const blob = new Blob([response as any])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.setAttribute('download', filename || 'download')
    document.body.appendChild(link)
    link.click()
    link.parentNode?.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  }

  // Get the underlying axios instance (for advanced usage)
  getInstance(): AxiosInstance {
    return this.axiosInstance
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient()

// Export convenience methods
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) => apiClient.get<T>(url, config),
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => apiClient.post<T>(url, data, config),
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => apiClient.put<T>(url, data, config),
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => apiClient.patch<T>(url, data, config),
  delete: <T = any>(url: string, config?: AxiosRequestConfig) => apiClient.delete<T>(url, config),
  uploadFile: <T = any>(
    url: string,
    file: File,
    onUploadProgress?: (progressEvent: any) => void,
    additionalData?: Record<string, any>
  ) => apiClient.uploadFile<T>(url, file, onUploadProgress, additionalData),
  downloadFile: (url: string, filename?: string) => apiClient.downloadFile(url, filename),
  setAuthToken: (token: string | null) => apiClient.setAuthToken(token),
  getAuthToken: () => apiClient.getAuthTokenFromStorage(),
  instance: apiClient.getInstance(),
}

// Default export
export default api
