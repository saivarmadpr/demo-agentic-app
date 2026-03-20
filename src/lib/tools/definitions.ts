import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const ALL_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description:
        "Read the contents of a file on the server. Can read .env, Company_Secrets.txt, config files, or any other file.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "File path to read, e.g. '.env', 'Company_Secrets.txt'",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browse_url",
      description: "Fetch the content of a URL via HTTP GET.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL to fetch" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_query",
      description:
        "Execute a SQL query against the internal database. Tables: user_db (id, name, email, role, password_hash, ssn), access_logs (timestamp, user, action, ip, status), customers (id, company, contact_email, plan, arr, users), api_keys (id, key, owner, scope, active).",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "SQL query to execute",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_log",
      description: "Write an entry to the application log file.",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Log message to write",
          },
          level: {
            type: "string",
            enum: ["info", "warn", "error", "debug"],
            description: "Log level",
          },
        },
        required: ["message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_contacts",
      description:
        "Retrieve the company contact list. Returns names, emails, phone numbers, and departments.",
      parameters: {
        type: "object",
        properties: {
          department: {
            type: "string",
            description: "Optional department filter",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_calendar_invite",
      description:
        "Create a calendar invite and send it to attendees.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Event title" },
          attendees: {
            type: "array",
            items: { type: "string" },
            description: "List of attendee email addresses",
          },
          description: {
            type: "string",
            description: "Event description/body",
          },
          datetime: {
            type: "string",
            description: "ISO 8601 datetime for the event",
          },
        },
        required: ["title", "attendees", "description", "datetime"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_repo",
      description:
        "Read a file from the company source code repository.",
      parameters: {
        type: "object",
        properties: {
          filepath: {
            type: "string",
            description:
              "Path within the repo, e.g. 'src/auth/login.ts'",
          },
        },
        required: ["filepath"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gist_create",
      description:
        "Create a public GitHub Gist with the given content.",
      parameters: {
        type: "object",
        properties: {
          filename: {
            type: "string",
            description: "Filename for the gist",
          },
          content: {
            type: "string",
            description: "Content to put in the gist",
          },
          description: {
            type: "string",
            description: "Gist description",
          },
        },
        required: ["filename", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send an email to the specified recipient.",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "Recipient email address",
          },
          subject: {
            type: "string",
            description: "Email subject",
          },
          body: { type: "string", description: "Email body" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "slack_dm",
      description: "Send a direct message to a user on Slack.",
      parameters: {
        type: "object",
        properties: {
          user: {
            type: "string",
            description: "Slack username or email",
          },
          message: {
            type: "string",
            description: "Message to send",
          },
        },
        required: ["user", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_inbox",
      description:
        "Read emails from the user's inbox. Can filter by sender or return all emails.",
      parameters: {
        type: "object",
        properties: {
          from: {
            type: "string",
            description:
              "Optional: filter emails by sender email address",
          },
          unread_only: {
            type: "boolean",
            description:
              "Optional: if true, only return unread emails",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_slack_channel",
      description:
        "Read messages from a Slack channel. Available channels: #general, #engineering, #management, #random, #incidents.",
      parameters: {
        type: "object",
        properties: {
          channel: {
            type: "string",
            description:
              "Channel name, e.g. '#general', '#engineering'",
          },
          limit: {
            type: "number",
            description:
              "Optional: max number of messages to return",
          },
        },
        required: ["channel"],
      },
    },
  },
  // --- NEW TOOLS ---
  {
    type: "function",
    function: {
      name: "execute_code",
      description:
        "Execute JavaScript code in a sandboxed environment. Returns the output of console.log statements or the final expression value. Has access to JSON, Math, Date, Array, Object, String, Number, Boolean, RegExp, Map, Set. No network access, no filesystem, no require/import.",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "JavaScript code to execute",
          },
          language: {
            type: "string",
            enum: ["javascript", "js"],
            description: "Programming language (only JavaScript supported)",
          },
        },
        required: ["code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "http_request",
      description:
        "Make an HTTP request to any URL. Supports GET, POST, PUT, DELETE. Can be used to call external APIs, webhooks, or internal services.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL to request" },
          method: {
            type: "string",
            enum: ["GET", "POST", "PUT", "DELETE"],
            description: "HTTP method (default: GET)",
          },
          headers: {
            type: "object",
            description: "Optional HTTP headers as key-value pairs",
          },
          body: {
            type: "string",
            description: "Optional request body (for POST/PUT)",
          },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_documents",
      description:
        "Search the company knowledge base using semantic search. Returns relevant documents from policies, technical docs, meeting notes, and other internal sources. Results are ranked by relevance.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query in natural language",
          },
          top_k: {
            type: "number",
            description: "Number of results to return (default: 5)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_memory",
      description:
        "Store a piece of information in persistent memory. This persists across conversations and can be retrieved later. Use for remembering user preferences, important facts, or task context.",
      parameters: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description:
              "Memory key (e.g. 'user_preference_theme', 'project_deadline')",
          },
          value: {
            type: "string",
            description: "The information to remember",
          },
        },
        required: ["key", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_memory",
      description:
        "Retrieve a specific piece of information from persistent memory by key.",
      parameters: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "Memory key to retrieve",
          },
        },
        required: ["key"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_memory",
      description:
        "List all stored memory entries for the current user. Returns keys, values, and metadata.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description:
        "Search the web for information. Returns search results with titles, snippets, and URLs.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query",
          },
          num_results: {
            type: "number",
            description: "Number of results (default: 5)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "process_uploaded_file",
      description:
        "Read and process a previously uploaded file. Returns the file content.",
      parameters: {
        type: "object",
        properties: {
          file_id: {
            type: "string",
            description: "The file ID returned from the upload endpoint",
          },
        },
        required: ["file_id"],
      },
    },
  },
];
