# SDK AI Template

## Overview

This is a Topia SDK AI Template that demonstrates how to build a React + TypeScript client with a Node.js + Express server that runs inside a Topia iframe using the JavaScript RTSDK – Topia Client Library (@rtsdk/topia). The application showcases integration with Topia's virtual world platform, allowing for interactive asset management, world interactions, and real-time communication between client and server components.

The template implements a complete end-to-end flow for handling interactive parameters from Topia iframe integration, server-side SDK operations, and responsive UI components with admin functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript and Vite for fast development
- **Styling**: Tailwind CSS with custom Topia SDK styles for consistent UI
- **State Management**: React Context API with useReducer for global state management
- **Routing**: React Router for client-side navigation
- **Build Tool**: Vite with SWC for fast compilation and hot module replacement

### Backend Architecture

- **Runtime**: Node.js with Express.js server framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **API Design**: RESTful endpoints with structured route handlers
- **SDK Integration**: Topia RTSDK factories for World, DroppedAsset, User, Visitor, and Asset operations
- **Error Handling**: Centralized error handler with structured logging
- **Development**: Hot reload with tsx watch for development efficiency

### Data Storage Solutions

- **Topia Data Objects**: Native Topia platform storage for:
  - Dropped asset metadata and interaction counts
  - World-level configuration data
  - User session and analytics data
- **No External Database**: Leverages Topia's built-in data persistence layer
- **Data Structure**: Type-safe interfaces for credentials and dropped asset data

### Authentication & Authorization

- **Interactive Credentials**: Topia's interactive key/secret pair system
- **Query Parameter Validation**: Server-side validation of required Topia parameters
- **Admin Role Detection**: Visitor-based admin permissions from Topia platform
- **Environment Variables**: Secure credential management through .env configuration

### Key Architectural Decisions

**Monorepo Workspace Structure**: Uses npm workspaces to separate client and server code while sharing dependencies and maintaining consistency.

**Type Safety**: Full TypeScript implementation across client and server with strict type checking and custom interfaces for Topia SDK integration.

**iframe Integration**: Designed specifically for Topia iframe embedding with query parameter handling for interactive sessions.

**SDK Factory Pattern**: Utilizes Topia's factory pattern for creating World, DroppedAsset, and other SDK instances with proper credential management.

**Stateless Server Design**: Server maintains no session state, relying on Topia's credential system for each request authentication.

## External Dependencies

### Primary Framework Dependencies

- **@rtsdk/topia**: Topia JavaScript SDK for world interactions, asset management, and platform integration
- **React 18**: Frontend framework with hooks and context for state management
- **Express.js**: Backend web framework for API routes and middleware
- **TypeScript**: Type safety across the entire application stack

### Development & Build Tools

- **Vite**: Frontend build tool with fast HMR and optimized production builds
- **tsx**: TypeScript execution engine for development server hot reload
- **Concurrently**: Run client and server development processes simultaneously
- **Jest**: Testing framework with TypeScript support and SDK mocking capabilities

### Styling & UI Dependencies

- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Topia SDK Styles**: Custom CSS framework provided by Topia for consistent UI components
- **Google Fonts**: Quicksand and Open Sans fonts for typography

### Utility Libraries

- **Axios**: HTTP client for API communication between client and server
- **CORS**: Cross-origin resource sharing configuration for development
- **dotenv**: Environment variable management for secure configuration

### Third-Party Integrations

- **Topia Platform**: Primary integration for virtual world interactions, user management, and asset manipulation
- **Leaderboard Service**: Optional integration with Topia's leaderboard API for player statistics tracking
- **Google Sheets API**: Integration capability through @googleapis/sheets for data export/import functionality

### Testing Infrastructure

- **Jest + Supertest**: API endpoint testing with mocked Topia SDK
- **SDK Mocking**: Custom mock implementation for Topia SDK methods in test environment
- **TypeScript Jest**: Native TypeScript support in test environment
