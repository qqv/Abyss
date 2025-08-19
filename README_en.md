<div align="center">
   
# Abyss

<img src="public/logo.svg" alt="Abyss Logo" width="200" height="200">

**🚀 A Modern API Testing and Management Platform**

A powerful and beautifully designed API development and testing tool, supporting professional features like collection management, proxy pools, and script-based testing.

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.16.0-green)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-Apache-yellow)](LICENSE)

</div>

## ✨ Core Features

### 🔧 API Testing & Management
- **Collection Management**: Create, organize, and manage API request collections.
- **Request Editor**: Supports all HTTP methods including GET, POST, PUT, DELETE, etc.
- **Parameter Management**: Query parameters, request headers, request body (JSON, Form Data, URL-encoded).
- **Environment Variables**: Support for multiple environments and dynamic variable substitution.
- **Batch Testing**: Concurrently execute multiple requests in a collection.
- **History Tracking**: Complete history and result tracking for all executed requests.

### 📝 Advanced Scripting System
- **Pre-request Scripts**: Data preparation and processing before sending a request.
- **Test Scripts**: Response validation and assertion testing.
- **Postman Compatibility**: Supports `pm.*` API, compatible with Postman script syntax.
- **Variable System**: Dynamically set and use environment variables.
- **Test Assertions**: Validate status codes, response times, and JSON data.

### 🌐 Proxy Pool Management
- **Multi-protocol Support**: HTTP, HTTPS, SOCKS4, SOCKS5.
- **Smart Rotation**: Strategies like random, sequential, and failover rotation.
- **Health Checks**: Automatically detect proxy availability and response time.
- **Batch Import**: Supports batch import of proxies from text and files.
- **Tunnel Management**: Create and manage proxy tunnels.
- **Real-time Monitoring**: Real-time monitoring of proxy status and response times.

### 🔒 Security & Performance
- **SSL/TLS Verification**: Certificate validation and secure connections.
- **Request Signing**: API request signing and authentication.
- **Performance Monitoring**: Monitor memory usage, cache status, and connection pools.
- **Request Interception**: Global request interception and handling.
- **Error Handling**: Comprehensive error capturing and handling mechanism.

### 📊 Data Management
- **Data Export**: Supports exporting in JSON and CSV formats.
- **Backup & Restore**: Full data backup and recovery functionality.
- **Storage Options**: Browser local storage or database storage.
- **Data Cleanup**: Cache clearing and history management.
- **Statistics**: Detailed statistics on data usage.

### 🎨 User Interface
- **Modern Design**: Based on Radix UI and Tailwind CSS.
- **Dark Mode**: Supports switching between light and dark themes.
- **Responsive Layout**: Perfectly adapts to both desktop and mobile devices.
- **Internationalization**: Bilingual support for Chinese and English.
- **Customizable Interface**: Settings for font size, density, and animations.

### 📋 Logging System
- **Categorized Logs**: API requests, proxy operations, system events.
- **Log Levels**: Debug, Info, Warning, Error.
- **Real-time View**: Real-time log streaming and search filtering.
- **Export Functionality**: Supports exporting logs in various formats.
- **Storage Management**: File system storage with support for log rotation.

## 🛠️ Tech Stack

### Frontend Technologies
- **Framework**: Next.js 15.2.4 (React 18.3.1)
- **Language**: TypeScript 5.7.3
- **UI Components**: Radix UI + Tailwind CSS
- **State Management**: React Hooks + Context
- **Form Handling**: React Hook Form + Zod
- **Internationalization**: i18next + react-i18next

### Backend Technologies
- **API**: Next.js API Routes
- **Database**: MongoDB 6.16.0 + Mongoose 8.15.0
- **Proxy Support**: http-proxy-agent, socks-proxy-agent
- **File Handling**: JSZip, FileSaver
- **Network Requests**: node-fetch, native Fetch API

### Development Tools
- **Code Quality**: Biome (Linting + Formatting)
- **Build Tool**: Next.js + Webpack
- **Package Manager**: npm / bun
- **Deployment**: Supports platforms like Vercel, Netlify, etc.

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- MongoDB 5.0 or higher
- npm, yarn, pnpm, or bun

### Installation Steps

1.  **Clone the project**
    ```bash
    git clone https://github.com/your-repo/abyss-api-studio.git
    cd abyss-api-studio
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    # or
    bun install
    ```

3.  **Environment Configuration**
    ```bash
    # Copy the environment variable file
    cp .env.example .env.local

    # Edit the environment variables
    # Configure the MongoDB connection string and other necessary settings
    ```

4.  **Initialize the database**
    ```bash
    # Initialize the MongoDB database
    npm run mongo-init

    # Or use the TypeScript initialization script
    npm run db-init
    ```

5.  **Start the development server**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    bun dev
    ```

6.  **Access the application**
    Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

### Environment Variable Configuration

Create a `.env.local` file and configure the following variables:

```env
# MongoDB database connection
MONGODB_URI=mongodb://localhost:27017/abyss

# Application configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Logging configuration
LOG_LEVEL=info
LOG_RETENTION_DAYS=30

# Proxy configuration (optional)
DEFAULT_PROXY_TIMEOUT=10000
MAX_CONCURRENT_REQUESTS=10
```

## 📖 Usage Guide

### API Collection Management

1.  **Create a Collection**
    - Click the "Create Collection" button in the sidebar.
    - Enter a name and description for the collection.
    - Organize and manage related API requests.

2.  **Add a Request**
    - Add a new API request within a collection.
    - Configure the request method, URL, parameters, and headers.
    - Write pre-request and test scripts.

3.  **Run Tests**
    - Test a single request or run an entire collection.
    - View execution progress and results in real-time.
    - Analyze response data and test outcomes.

### Proxy Pool Configuration

1.  **Add Proxies**
    - Supports HTTP, HTTPS, SOCKS4, SOCKS5 protocols.
    - Add proxies individually or through batch import.
    - Configure authentication details (username/password).

2.  **Health Checks**
    - Automatically detect proxy availability.
    - Set check intervals and failure thresholds.
    - View statistics on proxy response times.

3.  **Tunnel Management**
    - Create proxy tunnel groups.
    - Configure rotation strategies and rules.
    - Monitor tunnel usage.

## 🔧 Development Guide

### Project Structure

```
abyss-api-studio/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   ├── globals.css        # Global Styles
│   │   └── layout.tsx         # Root Layout
│   ├── components/            # Shared Components
│   ├── features/              # Feature Modules
│   │   ├── api-testing/       # API Testing Feature
│   │   ├── api-workspace/     # API Workspace
│   │   ├── proxy-pool/        # Proxy Pool Management
│   │   └── settings/          # System Settings
│   ├── lib/                   # Utility Libraries and Services
│   ├── models/                # Data Models
│   └── i18n/                  # Internationalization Config
├── public/                    # Static Assets
├── server/                    # Express Server (optional)
├── scripts/                   # Build and Deployment Scripts
└── docs/                      # Project Documentation
```

### Development Commands

```bash
# Development mode
npm run dev

# Lint and fix code
npm run lint

# Build for production
npm run build

# Start production server
npm run start

# Database initialization
npm run mongo-init
npm run db-init
```

### Contribution Guide

1.  Fork the project repository.
2.  Create a feature branch: `git checkout -b feature/amazing-feature`
3.  Commit your changes: `git commit -m 'Add amazing feature'`
4.  Push to the branch: `git push origin feature/amazing-feature`
5.  Create a Pull Request.

## 🤝 Community & Support

- **Bug Reports**: [GitHub Issues](https://github.com/qqv/abyss/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/qqv/abyss/discussions)

## 📄 License

This project is open-sourced under the [Apache License](LICENSE).

## 🙏 Acknowledgements

Thanks to the following open-source projects for their support:
- [Next.js](https://nextjs.org/) - The React Framework for the Web
- [Radix UI](https://www.radix-ui.com/) - Unstyled, accessible UI components
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- [MongoDB](https://www.mongodb.com/) - The developer data platform
- [TypeScript](https://www.typescriptlang.org/) - JavaScript with syntax for types

</div>

