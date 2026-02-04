# Dependency Compliance Inventory

This document provides a full inventory of third-party libraries used in LexiPro Forensic OS (v4.8.2) to ensure no "copyleft" (e.g., GPL/AGPL) legal encumbrances exist.

## Frontend (React/Vite)

| Package | Version | License | Usage |
| :--- | :--- | :--- | :--- |
| `@fortawesome/fontawesome-free` | ^7.1.0 | Font Awesome Free License (CC BY 4.0/MIT) | Icon Fonts |
| `react` | ^19.0.0 | MIT | Core UI Framework |
| `react-dom` | ^19.0.0 | MIT | DOM Rendering |
| `react-pdf` | ^10.3.0 | MIT | PDF Rendering |
| `react-router-dom` | ^7.12.0 | MIT | Client Routing |
| `framer-motion` | ^11.11.11 | MIT | UI Transitions |
| `lucide-react` | ^0.460.0 | ISC | Iconography |
| `tailwind-merge` | ^2.5.4 | MIT | Style Management |
| `clsx` | ^2.1.1 | MIT | Class Utility |
| `pdfjs-dist` | 5.4.296 | Apache-2.0 | PDF Parsing & Rendering |

## Backend (Node.js/Express)

| Package | Version | License | Usage |
| :--- | :--- | :--- | :--- |
| `@aws-sdk/client-s3` | ^3.712.0 | Apache-2.0 | Object Storage |
| `express` | ^4.21.2 | MIT | API Proxy |
| `@prisma/client` | ^5.22.0 | Apache-2.0 | Multi-tenant ORM |
| `@google/genai` | ^1.34.0 | Apache-2.0 | Forensic Synthesis Engine |
| `jsonwebtoken` | ^9.0.2 | MIT | Workspace Authentication |
| `bcryptjs` | ^2.4.3 | MIT | Credential Security |
| `cors` | ^2.8.5 | MIT | Security Middleware |
| `express-rate-limit` | ^8.2.1 | MIT | Rate Limiting |
| `multer` | ^2.0.2 | MIT | File Ingestion |
| `node-cron` | ^3.0.3 | MIT | Scheduled Jobs |
| `pdf-lib` | ^1.17.1 | MIT | PDF Generation |
| `pdfjs-dist` | ^4.8.69 | Apache-2.0 | PDF Parsing |
| `zod` | ^3.23.8 | MIT | Schema Validation |
| `dotenv` | ^16.4.7 | BSD-2-Clause | Configuration |

## Infrastructure

| Component | License | Purpose |
| :--- | :--- | :--- |
| `PostgreSQL` | PostgreSQL | Database Persistence |
| `Docker` | Apache-2.0 | Container Orchestration |

---
**Summary:** 100% of dependencies use permissive licenses (MIT, Apache-2.0, BSD). No Viral/Copyleft (GPL) code detected. This codebase is ready for commercial acquisition and proprietary licensing.
