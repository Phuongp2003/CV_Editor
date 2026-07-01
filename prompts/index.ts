import seVi from './se/prompts/vi.txt?raw'
import seEn from './se/prompts/en.txt?raw'
import seViGems from './se/gems/vi.txt?raw'
import seEnGems from './se/gems/en.txt?raw'

import baVi from './ba/prompts/vi.txt?raw'
import baEn from './ba/prompts/en.txt?raw'
import baViGems from './ba/gems/vi.txt?raw'
import baEnGems from './ba/gems/en.txt?raw'

import qcVi from './qc/prompts/vi.txt?raw'
import qcEn from './qc/prompts/en.txt?raw'
import qcViGems from './qc/gems/vi.txt?raw'
import qcEnGems from './qc/gems/en.txt?raw'

import poVi from './po/prompts/vi.txt?raw'
import poEn from './po/prompts/en.txt?raw'
import poViGems from './po/gems/vi.txt?raw'
import poEnGems from './po/gems/en.txt?raw'

import convertVi from './convert/prompts/vi.txt?raw'
import convertEn from './convert/prompts/en.txt?raw'
import convertViGems from './convert/gems/vi.txt?raw'
import convertEnGems from './convert/gems/en.txt?raw'

export interface PromptItem {
  id: 'se' | 'ba' | 'qc' | 'po' | 'convert'
  icon: string
  title: {
    English: string
    Vietnamese: string
  }
  description: {
    English: string
    Vietnamese: string
  }
  instructions: {
    English: string[]
    Vietnamese: string[]
  }
  promptTemplate: {
    English: string
    Vietnamese: string
  }
  gemsLink: {
    English: string
    Vietnamese: string
  }
}

export const promptList: PromptItem[] = [
  {
    id: 'se',
    icon: 'i-lucide-code',
    title: {
      English: 'Software Engineer',
      Vietnamese: 'Software Engineer'
    },
    description: {
      English: 'Review and optimize CV for Software Engineers (Backend, Frontend, Fullstack, Mobile...) matching target JD.',
      Vietnamese: 'Đánh giá CV và hỗ trợ viết CV theo JD cho Software Engineer (Backend, Frontend, Fullstack, Mobile...).'
    },
    instructions: {
      English: [
        'Select the target language for your CV in the formatting settings.',
        'Copy the system prompt below and paste it into Gemini or ChatGPT.',
        'Provide the Job Description (JD) and your current information to the AI.',
        'Answer the STAR-style interview questions to clarify your technical contributions and metrics.',
        'Copy the final JSON block from the AI, paste it in the Importer section below, and click Import.'
      ],
      Vietnamese: [
        'Chọn ngôn ngữ mục tiêu cho CV của bạn trong phần cài đặt định dạng.',
        'Sao chép prompt hệ thống bên dưới và dán vào Gemini hoặc ChatGPT.',
        'Cung cấp Mô tả công việc (JD) và thông tin hiện tại của bạn cho AI.',
        'Trả lời các câu hỏi phỏng vấn theo phương pháp STAR của AI để làm rõ các số liệu đóng góp kỹ thuật.',
        'Sao chép khối JSON kết quả cuối cùng từ AI, dán vào phần Import bên dưới và nhấn Import.'
      ]
    },
    promptTemplate: {
      English: seEn,
      Vietnamese: seVi
    },
    gemsLink: {
      English: seEnGems,
      Vietnamese: seViGems
    }
  },
  {
    id: 'ba',
    icon: 'i-lucide-presentation',
    title: {
      English: 'Business Analyst',
      Vietnamese: 'Business Analyst'
    },
    description: {
      English: 'Tailor CV for Business Analyst roles focusing on requirements, BPMN/UML processes, and stakeholder coordination.',
      Vietnamese: 'Đánh giá CV và hỗ trợ viết CV theo JD cho Business Analyst (BPMN, UML, User Story, Stakeholders...).'
    },
    instructions: {
      English: [
        'Select the target language for your CV in the formatting settings.',
        'Copy the system prompt below and paste it into Gemini or ChatGPT.',
        'Provide the Job Description (JD) and your BA experience details to the AI.',
        'Answer the interview questions regarding requirements elicitation, workflow mapping, and process metrics.',
        'Copy the final JSON block from the AI, paste it below, and click Import.'
      ],
      Vietnamese: [
        'Chọn ngôn ngữ mục tiêu cho CV của bạn trong phần cài đặt định dạng.',
        'Sao chép prompt hệ thống bên dưới và dán vào Gemini hoặc ChatGPT.',
        'Cung cấp Mô tả công việc (JD) và thông tin kinh nghiệm BA của bạn cho AI.',
        'Trả lời các câu hỏi phỏng vấn về khơi gợi yêu cầu, vẽ luồng quy trình nghiệp vụ và các chỉ số cải tiến.',
        'Sao chép khối JSON kết quả cuối cùng từ AI, dán vào phần Import bên dưới và nhấn Import.'
      ]
    },
    promptTemplate: {
      English: baEn,
      Vietnamese: baVi
    },
    gemsLink: {
      English: baEnGems,
      Vietnamese: baViGems
    }
  },
  {
    id: 'qc',
    icon: 'i-lucide-shield-check',
    title: {
      English: 'Software Quality Control',
      Vietnamese: 'Software Quality Control'
    },
    description: {
      English: 'Optimize CV for QA/QC and Test Automation Engineers highlighting test suites, defect rates, and frameworks.',
      Vietnamese: 'Đánh giá CV và hỗ trợ viết CV theo JD cho Software Quality Control (QA/QC, Manual/Automation Test).'
    },
    instructions: {
      English: [
        'Select the target language for your CV in the formatting settings.',
        'Copy the system prompt below and paste it into Gemini or ChatGPT.',
        'Provide the Job Description (JD) and your testing experience details to the AI.',
        'Answer questions on automation frameworks (Playwright, Selenium), API testing, and quality metrics (defect escape rate).',
        'Copy the final JSON block from the AI, paste it below, and click Import.'
      ],
      Vietnamese: [
        'Chọn ngôn ngữ mục tiêu cho CV của bạn trong phần cài đặt định dạng.',
        'Sao chép prompt hệ thống bên dưới và dán vào Gemini hoặc ChatGPT.',
        'Cung cấp Mô tả công việc (JD) và thông tin kinh nghiệm QA/QC của bạn cho AI.',
        'Trả lời các câu hỏi về framework tự động (Playwright, Selenium), test API, test hiệu năng và chỉ số lỗi trượt.',
        'Sao chép khối JSON kết quả cuối cùng từ AI, dán vào phần Import bên dưới và nhấn Import.'
      ]
    },
    promptTemplate: {
      English: qcEn,
      Vietnamese: qcVi
    },
    gemsLink: {
      English: qcEnGems,
      Vietnamese: qcViGems
    }
  },
  {
    id: 'po',
    icon: 'i-lucide-rocket',
    title: {
      English: 'Product Owner',
      Vietnamese: 'Product Owner'
    },
    description: {
      English: 'Tailor CV for Product Owners / Product Managers focusing on roadmaps, priorities, and growth metrics.',
      Vietnamese: 'Đánh giá CV và hỗ trợ viết CV theo JD cho Production Owner / Product Owner / Product Manager.'
    },
    instructions: {
      English: [
        'Select the target language for your CV in the formatting settings.',
        'Copy the system prompt below and paste it into Gemini or ChatGPT.',
        'Provide the Job Description (JD) and your product management details to the AI.',
        'Answer questions regarding roadmap execution, backlog prioritization (RICE/MoSCoW), and user growth metrics.',
        'Copy the final JSON block from the AI, paste it below, and click Import.'
      ],
      Vietnamese: [
        'Chọn ngôn ngữ mục tiêu cho CV của bạn trong phần cài đặt định dạng.',
        'Sao chép prompt hệ thống bên dưới và dán vào Gemini hoặc ChatGPT.',
        'Cung cấp Mô tả công việc (JD) và thông tin kinh nghiệm làm sản phẩm của bạn cho AI.',
        'Trả lời các câu hỏi về xây dựng lộ trình roadmap, ưu tiên backlog (RICE/MoSCoW) và các chỉ số tăng trưởng người dùng.',
        'Sao chép khối JSON kết quả cuối cùng từ AI, dán vào phần Import bên dưới và nhấn Import.'
      ]
    },
    promptTemplate: {
      English: poEn,
      Vietnamese: poVi
    },
    gemsLink: {
      English: poEnGems,
      Vietnamese: poViGems
    }
  },
  {
    id: 'convert',
    icon: 'i-lucide-refresh-cw',
    title: {
      English: 'CV Converter (From Other CV)',
      Vietnamese: 'Viết CV từ CV khác'
    },
    description: {
      English: 'Convert any existing CV (raw text, PDF text, or agent memory) into a high-quality formatted CV & Cover Letter.',
      Vietnamese: 'Đưa 1 CV khác (từ agent memory, pdf copy, ...) thành CV thật, hỗ trợ nhiều ngành nghề khác nhau.'
    },
    instructions: {
      English: [
        'Paste your existing raw CV text or profile details into Gemini/ChatGPT.',
        'Instruct the AI to read your CV, and copy the system prompt below to enforce professional styling and formatting.',
        'Interact with the AI to refine any vague bullet points or metrics.',
        'Copy the final output JSON block, paste it below, and click Import.'
      ],
      Vietnamese: [
        'Dán nội dung CV thô hoặc thông tin cá nhân hiện có của bạn vào Gemini/ChatGPT.',
        'Yêu cầu AI đọc thông tin đó, và dán prompt hệ thống bên dưới để bắt nó định dạng theo cấu trúc chuẩn.',
        'Trò chuyện với AI để tinh chỉnh các chi tiết chưa rõ ràng hoặc bổ sung số liệu.',
        'Sao chép khối JSON kết quả cuối cùng, dán vào ô bên dưới và nhấn Import.'
      ]
    },
    promptTemplate: {
      English: convertEn,
      Vietnamese: convertVi
    },
    gemsLink: {
      English: convertEnGems,
      Vietnamese: convertViGems
    }
  }
]
