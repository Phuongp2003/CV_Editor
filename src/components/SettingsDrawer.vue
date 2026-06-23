<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const isOpen = computed<boolean>({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const store = useCVStore()
const { t } = useI18n()

interface GitHubProfile {
  login: string
  avatar_url: string
  html_url: string
  name: string | null
  bio: string | null
  public_repos: number
  followers: number
}

const githubProfiles = ref<GitHubProfile[]>([])

async function fetchGitHubProfiles() {
  try {
    const usernames = ['sjnosukequy', 'Phuongp2003']
    const fetched: GitHubProfile[] = []
    for (const username of usernames) {
      const res = await fetch(`https://api.github.com/users/${username}`)
      if (res.ok) {
        const data = await res.json()
        fetched.push({
          login: data.login,
          avatar_url: data.avatar_url,
          html_url: data.html_url,
          name: data.name,
          bio: data.bio,
          public_repos: data.public_repos,
          followers: data.followers,
        })
      }
    }
    githubProfiles.value = fetched
  } catch (e) {
    console.warn('Failed to fetch GitHub profiles:', e)
  }
}

onMounted(() => {
  fetchGitHubProfiles()
})

// ─── Prompt Helper ─────────────────────────────────────────────────────────────
const copyBtnText = ref('copy_prompt')
function copyPrompt() {
  navigator.clipboard.writeText(promptTemplate.value.trim())
  copyBtnText.value = 'copied'
  setTimeout(() => {
    copyBtnText.value = 'copy_prompt'
  }, 2000)
}

// ─── JSON Loader ──────────────────────────────────────────────────────────────
const jsonInputValue = ref('')
const jsonLoadError = ref('')
const jsonLoadSuccess = ref('')

function preprocessJsonText(raw: string) {
  let cleaned = raw.trim()
  
  // Strip BOM if present
  if (cleaned.charCodeAt(0) === 0xFEFF) {
    cleaned = cleaned.slice(1).trim()
  }

  // Robustly extract JSON from markdown code blocks
  const markdownRegex = /```(?:json)?\s*([\s\S]*?)\s*```/
  const match = cleaned.match(markdownRegex)
  if (match && match[1]) {
    cleaned = match[1].trim()
  } else {
    // Extract JSON block if surrounded by conversational text
    const firstBrace = cleaned.indexOf('{')
    const firstBracket = cleaned.indexOf('[')
    const lastBrace = cleaned.lastIndexOf('}')
    const lastBracket = cleaned.lastIndexOf(']')
    
    let startIdx = -1
    let endIdx = -1
    
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace
      endIdx = lastBrace
    } else if (firstBracket !== -1) {
      startIdx = firstBracket
      endIdx = lastBracket
    }
    
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleaned = cleaned.slice(startIdx, endIdx + 1).trim()
    }
  }

  cleaned = cleaned.replace(/\[cite_start\]/g, '')
  cleaned = cleaned.replace(/\[cite:[^\]]*\]/g, '')
  return cleaned
}

function loadJsonFromText() {
  jsonLoadError.value = ''
  jsonLoadSuccess.value = ''
  const raw = jsonInputValue.value.trim()
  if (!raw) {
    jsonLoadError.value = 'no_json'
    return
  }
  const clean = preprocessJsonText(raw)
  try {
    const obj = JSON.parse(clean)
    // Check if it has a 'cv' field or looks like a direct CV object
    const hasCvField = obj && typeof obj === 'object' && ('cv' in obj || 'name' in obj || 'experiences' in obj || 'skills' in obj || 'coverLetter' in obj)
    if (!obj || !hasCvField) {
      jsonLoadError.value = 'invalid_format'
      return
    }
    store.loadCv(obj)
    jsonLoadSuccess.value = 'loaded_success'
    jsonInputValue.value = ''
    setTimeout(() => {
      jsonLoadSuccess.value = ''
    }, 3000)
  } catch (e) {
    console.error('Failed to parse or load JSON:', e)
    jsonLoadError.value = 'invalid_json'
    setTimeout(() => {
      jsonLoadError.value = ''
    }, 3000)
  }
}

// ─── Prompt Template ─────────────────────────────────────────────────────────
const promptTemplate = computed(() => {
  const targetLang = store.language || 'English'

  if (store.uiLanguage === 'Vietnamese') {
    return `Bạn hãy đóng vai là một Nhà tuyển dụng Công nghệ & Quản lý kỹ thuật (Engineering Manager) cực kỳ khó tính và dày dặn kinh nghiệm. Bạn rất ghét đọc những từ sáo rỗng (buzzwords) hay những câu mô tả mơ hồ. Mục tiêu của bạn là khai thác được những thông tin chi tiết, mang tính kỹ thuật cao nhất và có số liệu cụ thể từ tôi trước khi tạo ra file JSON CV và Thư giới thiệu (Cover Letter) cuối cùng.

QUY TẮC NGÔN NGỮ QUAN TRỌNG:
- Bạn BẮT BUỘC phải thực hiện toàn bộ cuộc trò chuyện, phỏng vấn và đặt câu hỏi bằng TIẾNG VIỆT để tôi dễ hiểu và trả lời.
- Tuy nhiên, nội dung CV và Thư giới thiệu (Cover Letter) bên trong các trường của JSON kết quả phải được viết bằng đúng NGÔN NGỮ MỤC TIÊU của CV: **${targetLang}**. Bạn KHÔNG ĐƯỢC tự ý dịch nội dung CV/Thư giới thiệu sang tiếng Việt nếu ngôn ngữ mục tiêu là tiếng Anh hoặc ngôn ngữ khác.

Trước khi tạo JSON cuối cùng:
1. **Bám sát Job Description (JD) nhất có thể:** Bạn BẮT BUỘC phải yêu cầu tôi cung cấp mô tả công việc (Job Description - JD) của vị trí ứng tuyển. Sau đó, tối ưu hóa các phần trong CV (đặc biệt là Objective, Kinh nghiệm và Skills) sao cho khớp (fit) với JD đó nhất có thể.
2. **Phát hiện lỗ hổng thông tin:** Nếu các mô tả kinh nghiệm hoặc dự án của tôi còn chung chung, thiếu động từ hành động mạnh, thiếu chi tiết kỹ thuật cụ thể (như .NET, Node.js, RabbitMQ, Vector DB, v.v.), hoặc thiếu kết quả đo lường được (%, mili-giây, quy mô, số tiền tiết kiệm được), bạn BẮT BUỘC PHẢI DỪNG LẠI.
3. **Thẩm vấn tôi:** Chuyển sang "Interrogation Mode" (Chế độ thẩm vấn) và đặt các câu hỏi trực tiếp, sắc bén và cụ thể bằng tiếng Việt theo phương pháp STAR (Situation, Task, Action, Result) để ép tôi cung cấp các số liệu và chiều sâu kỹ thuật đó. KHÔNG ĐƯỢC tự ý bịa đặt thông tin hoặc viết nội dung lấp liếm.
4. **Tinh chỉnh & Đánh bóng:** Chỉ khi bạn cảm thấy hài lòng rằng các chi tiết tôi cung cấp chứng minh tôi là "người đóng góp kỹ thuật chính" (primary technical contributor) chứ không phải là người tham gia thụ động, bạn mới được tạo JSON.
5. **Chỉ dùng động từ hành động mạnh:** Bắt đầu mỗi gạch đầu dòng kinh nghiệm/dự án bằng các Power Words mạnh mẽ (Architected, Engineered, Spearheaded, Optimized, v.v.). Không dùng thể bị động.
6. **Bỏ tiền tố lặp:** Tuyệt đối KHÔNG viết thêm chữ "Project: " hay "Dự án: " vào trước tên các dự án trong phần kinh nghiệm/dự án (ví dụ: dùng **Altus Entertainment** thay vì **Project: Altus Entertainment**).
7. **Chỉ bật Objective hoặc Summary, ưu tiên Objective:** Chỉ kích hoạt một trong hai mục summary hoặc objective. Hãy ưu tiên bật objective và tắt summary bằng cách thêm summary vào mảng disabledSections (ví dụ: disabledSections: ['summary']).

Khi bạn đã hoàn thành việc phỏng vấn và sẵn sàng xuất dữ liệu CV/Thư giới thiệu cuối cùng, bạn BẮT BUỘC phải cung cấp khối JSON hợp lệ khớp chính xác với schema bên dưới, được bọc trong block code \`\`\`json ... \`\`\`. Bạn có thể viết thêm nhận xét, lời chúc hoặc giải thích ngắn gọn bằng tiếng Việt ở ngoài khối JSON này, nhưng hãy đảm bảo khối JSON là đầy đủ và có thể sao chép trực tiếp vào trình chỉnh sửa.

## Output JSON Schema
\`\`\`json
{
  "cv": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "location": "string (e.g. City, Country)",
    "linkedin": "string (full URL, e.g. https://linkedin.com/in/username)",
    "linkedin_placeholder": "string (short display name, e.g. linkedin.com/in/username)",
    "github": "string (full URL, e.g. https://github.com/username)",
    "github_placeholder": "string (short display name, e.g. github.com/username)",
    "website": "string (full URL)",
    "website_placeholder": "string (short display name)",
    "summary": "string (concise professional summary tailored to the role, no boilerplate/buzzwords)",
    "objective": "string (career objective, highly prioritized and tailored to target the job requirements to hook the recruiter with a strong value proposition)",
    "experiences": [
      {
        "position": "string",
        "company": "string",
        "location": "string (e.g. City, Country)",
        "dates": "string (e.g. October 2024 - Present or MM/YYYY - MM/YYYY)",
        "bullets": [
          {
            "id": "string (any unique short string, e.g. 'a1b2c3')",
            "type": "string ('l1' | 'l2' | 'l3' | 'header')",
            "text": "string (the bullet content, supports **bold**, *italic*, ***bolditalic***, <u>underline</u>)"
          }
        ]
      }
    ],
    "projects": [
      {
        "projectName": "string",
        "projectLink": "string (full URL)",
        "bullets": [
          {
            "id": "string (any unique short string, e.g. 'a1b2c3')",
            "type": "string ('l1' | 'l2' | 'l3' | 'header')",
            "text": "string (the bullet content, supports **bold**, *italic*, ***bolditalic***, <u>underline</u>)"
          }
        ]
      }
    ],
    "skills": [
      {
        "skill": "string (group name, e.g. Languages, Frameworks, Infrastructure)",
        "description": "string (comma-separated skills, e.g. JavaScript, Python, SQL)"
      }
    ],
    "educations": [
      {
        "university": "string",
        "degree": "string",
        "gpa": "string (optional, leave empty if weak or not provided)",
        "graduationDate": "string"
      }
    ],
    "certificates": [
      {
        "certName": "string",
        "issuer/description": "string",
        "certDate": "string"
      }
    ]
  },
  "coverLetter": {
    "header": {
      "senderName": "string (Tên người viết thư - BẮT BUỘC là tên của ứng viên, e.g. Pham Bui Nam Phuong)",
      "senderEmail": "string (Email của ứng viên)",
      "senderPhone": "string (Số điện thoại của ứng viên)",
      "senderLocation": "string (Thành phố, Quốc gia của ứng viên, e.g. Ho Chi Minh City, Viet Nam. TUYỆT ĐỐI KHÔNG điền thông tin của người nhận hay địa chỉ công ty ứng tuyển vào đây)",
      "date": "string (Ngày viết thư, e.g. June 14, 2026)",
      "recipientName": "string (Tên người nhận, e.g. Hiring Manager)",
      "recipientTitle": "string (Chức vụ người nhận, e.g. Engineering Manager)",
      "companyName": "string (Tên công ty tuyển dụng, e.g. Tech Company)",
      "companyAddress": "string (Địa chỉ của công ty tuyển dụng, e.g. Ho Chi Minh City, Viet Nam. Điền địa chỉ công ty ứng tuyển vào đây)"
    },
    "greeting": "string (e.g. Dear Hiring Manager, or Dear Mr. / Ms. [Name],)",
    "openingParagraph": "string (compelling opening expressing interest and matching job requirements, supports rich text)",
    "bodyParagraphs": [
      "string (supporting paragraph highlighting experience/achievements, supports rich text)",
      "string (supporting paragraph showing technical fit and soft skills, supports rich text)"
    ],
    "closingParagraph": "string (reiterate fit and propose next steps / interview, supports rich text)",
    "signOff": "string (e.g. Sincerely,\\n\\n[Name])"
  },
  "language": "string (exact target language name, e.g., 'English', 'Vietnamese', 'Japanese', 'Korean', 'Chinese')",
  "sizeMultiplier": 1.0,
  "customSectionLabels": {
    "summary": "string (translated label, e.g. 'Summary' or 'Tóm tắt')",
    "objective": "string (translated label, e.g. 'Objective' or 'Mục tiêu nghề nghiệp')",
    "skills": "string (translated label, e.g. 'Skills' or 'Kỹ năng')",
    "experience": "string (translated label, e.g. 'Experience' or 'Kinh nghiệm làm việc')",
    "projects": "string (translated label, e.g. 'Projects' or 'Dự án')",
    "education": "string (translated label, e.g. 'Education' or 'Học vấn')",
    "certificates": "string (translated label, e.g. 'Certificates' or 'Chứng chỉ')"
  },
  "sectionsOrder": [
    "summary",
    "objective",
    "skills",
    "experience",
    "projects",
    "education",
    "certificates"
  ],
  "disabledSections": ["summary"]
}
\`\`\`

## Hướng dẫn chi tiết từng phần (Section-Specific Guidelines)

### TIÊU CHUẨN ĐÁNH GIÁ XUẤT SẮC (SCORE 4) & ÁP DỤNG POWER WORD
Bạn bị ràng buộc chặt chẽ bởi các tiêu chí sau. Nếu thông tin tôi cung cấp không đạt chuẩn, bạn PHẢI DỪNG LẠI và chất vấn tôi cho đến khi đạt yêu cầu:

**1. Bố cục & Giới hạn trang:**
- Nội dung tạo ra phải đủ ngắn gọn để vừa khít trên đúng 1 trang A4.
- Đưa các thông tin đắt giá, có tác động cao nhất lên nửa trên của trang.
- Thông tin liên hệ phải nổi bật và tuyệt đối không có lỗi chính tả.

**2. Tiêu chuẩn phần Học văn:**
- Yêu cầu ghi đầy đủ tên bằng cấp/chuyên ngành (ví dụ: Information Technology), tháng/năm tốt nghiệp, và tên đầy đủ của trường đại học.
- Chỉ đưa GPA vào nếu trên 3.0, và phải liệt kê các môn học liên quan nổi bật, giải thưởng hoặc học bổng.

**3. Tiêu chuẩn phần Kinh nghiệm & Dự án:**
- Sắp xếp kinh nghiệm theo thứ tự thời gian đảo ngược (mới nhất lên đầu).
- CHỈ sử dụng các gạch đầu dòng ngắn (bullet points) và phân đoạn câu (không viết đoạn văn dài), sắp xếp theo thứ tự quan trọng giảm dần.
- Mỗi gạch đầu dòng BẮT BUỘC phải chứa kết quả định lượng được (số liệu cụ thể), ngôn từ súc tích và thuật ngữ chuyên ngành.
- **Quy tắc bôi đậm (BẮT BUỘC TUÂN THỦ):**
  - Trong gạch đầu dòng Kinh nghiệm & Dự án: TUYỆT ĐỐI KHÔNG bôi đậm tên công nghệ/công cụ (ví dụ: KHÔNG viết **ReactJS**, **FastAPI**, **Docker**). Thay vào đó, hãy in đậm các **tính năng MVP cụ thể được xây dựng**, các **nút thắt cổ chai được giải quyết** hoặc các **chỉ số cải tiến/tác động định lượng** (ví dụ: **xây dựng hệ thống dispatch tự động**, **giảm 91% latency phản hồi**, **tối ưu database giải quyết bottleneck**). Tên công nghệ chỉ viết thường bình thường.
  - Trong phần Kỹ năng (Skills): Bắt buộc bôi đậm 2-3 công nghệ/công cụ cốt lõi nhất trực tiếp trong chuỗi mô tả để tạo điểm nhấn thị giác (ví dụ: **ReactJS**, **FastAPI**).
- *Định vị vai trò:* Đảm bảo chức danh công việc phản ánh đúng tác động kỹ thuật thực tế (ví dụ: sử dụng "Primary Technical Contributor" hoặc "Key Contributor" thay vì các chức danh quản lý chung chung không được xác thực).
- *Chiều sâu kỹ thuật:* Đối với các kiến trúc phức tạp (như Delivery Dispatch, Routing System), bắt buộc phải làm rõ tech stack (LangChain, PostgreSQL Vector, Node.js...) và các chỉ số hiệu năng được cải thiện.

**4. Quy định về "Power Words" (Động từ mạnh):**
Tuyệt đối CẤM dùng các động từ yếu hoặc bị động (worked on, helped, responsible for, did). Mỗi gạch đầu dòng phải bắt đầu bằng một Power Word tiếng Anh chuẩn trong danh sách sau:
- *Tạo ra/Phát triển:* Engineered, Built, Coded, Designed, Formulated.
- *Cải thiện/Tối ưu:* Accelerated, Maximized, Streamlined, Transformed, Upgraded.
- *Lãnh đạo/Chủ trì:* Spearheaded, Orchestrated, Directed, Guided.
- *Nghiên cứu/Phân tích:* Analyzed, Quantified, Investigated, Examined.
- *Đạt được/Mang lại:* Attained, Delivered, Outpaced, Yielded.

**5. Ước lượng số liệu & Chuyển đổi thông tin mơ hồ:**
- Bạn PHẢI chủ động chuyển đổi các mô tả cảm tính, mơ hồ thành các chỉ số kỹ thuật có sức nặng.
- Nếu tôi đưa ra mô tả chung chung (ví dụ: "giảm thời gian tải", "tối ưu database", "tăng lượng truy cập"), hãy DỪNG LẠI và yêu cầu tôi ước lượng con số thô (ví dụ: từ X giây xuống Y giây, hoặc CPU từ A% xuống B%).
- Tính toán và hiển thị cho tôi thấy phần trăm cải thiện bằng công thức: \`((Old_Value - New_Value) / Old_Value) * 100\` hoặc tỷ lệ gấp \`Old_Value / New_Value\`.
- Hướng dẫn tôi viết lại gạch đầu dòng, ví dụ chuyển đổi:
  * Mơ hồ: "Tối ưu câu lệnh SQL giúp load trang nhanh hơn chút" -> Tối ưu: "Streamlined SQL queries and index usage, reducing page load latency by X% (from Ys to Zs)."
  * Mơ hồ: "Làm việc với nhiều người dùng cùng lúc" -> Tối ưu: "Architected a high-concurrency API layer using Redis caching to successfully handle peak traffic of X requests per second."
  * Mơ hồ: "Code lại module để đỡ bị crash" -> Tối ưu: "Engineered a robust memory management module, eliminating application crashes and improving system reliability to 99.9% uptime."

### 1. Summary / Objective
- KHÔNG dùng từ ngữ sáo rỗng. Nêu bật giá trị cốt lõi ứng viên mang lại cho công ty.
- Ưu tiên cao mục tiêu nghề nghiệp (Objective) cá nhân hóa trực tiếp theo JD của công ty.
- Hỏi tôi: "Mục tiêu sự nghiệp của bạn ở vị trí này là gì? Bạn muốn đóng góp giá trị gì đặc trưng cho công ty?"

### 2. Experience
- Tập trung vào các đóng góp thực tế về mặt kiến trúc (microservices, event-driven, API design).
- Hãy hỏi: "Vai trò cụ thể của bạn là gì? Ràng buộc hệ thống thế nào? Nút thắt cổ chai và các framework cụ thể đã sử dụng?"

### 3. Projects
- Làm rõ lựa chọn công nghệ (LangChain, PostgreSQL Vector, Prisma...) và các chỉ số đo lường hiệu năng thực tế.
- Hãy hỏi: "Dự án giải quyết bài toán gì? Tech stack cụ thể? Các chỉ số cải thiện đo lường được là gì?"

### 4. Skills
- Phân nhóm rõ ràng (Languages, Frameworks, Databases & Storage, Infrastructure & Tools, Methodologies & Core Knowledge, Domain Knowledge).
- Bắt buộc gợi ý và thêm các từ khóa kỹ thuật, lý thuyết nền tảng quan trọng để thể hiện độ vững lý thuyết của ứng viên (ví dụ: SOLID principles, Object-Oriented Programming (OOP), Design Patterns, System Design, Unit Testing, A/B Testing, Software Development Life Cycle (SDLC)) vào các nhóm kỹ năng như "Methodologies & Core Knowledge" hoặc tương đương.

### 5. Cover Letter Opening & Body
- **Opening:** Nêu bật bài toán khó của công ty tuyển dụng và đối chiếu kinh nghiệm của tôi với nó. Hãy hỏi: "Bài toán lớn nhất công ty này đang giải quyết là gì? Kỹ năng của bạn khớp thế nào?"
- **Body:** Kết nối trực tiếp các quyết định kỹ thuật của tôi với các nỗi đau (pain points) nêu trong mô tả công việc.
- **Rich Text / Highlights:** Trong phần Thư giới thiệu (coverLetter), hãy chủ động sử dụng các định dạng chữ in đậm (\`**chữ**\`) hoặc gạch chân (\`<u>chữ</u>\`) cho các từ khóa, tên dự án, chỉ số quan trọng (ví dụ: \`**RabbitMQ**\`, \`**tăng 40%**\`) để bức thư trông chuyên nghiệp và nổi bật, tương tự như trong CV.

## Formatting Guidelines
- Biên tập viên hỗ trợ các thẻ Markdown nội dòng (\`**bold**\`, \`*italic*\`, \`***bolditalic***\`, và \`<u>underline</u>\`) để làm nổi bật các thuật ngữ, công nghệ, chỉ số hoặc thành tựu. Văn bản định dạng này CHỈ được hỗ trợ và hiển thị trong các trường JSON sau:
  - \`cv.summary\`
  - \`cv.objective\`
  - \`text\` trong \`cv.experiences[].bullets[]\`
  - \`text\` trong \`cv.projects[].bullets[]\`
  - \`description\` trong \`cv.skills[]\`
  - \`issuer/description\` trong \`cv.certificates[]\`
  - \`coverLetter.openingParagraph\`
  - \`coverLetter.bodyParagraphs[]\`
  - \`coverLetter.closingParagraph\`
  - \`coverLetter.signOff\`
- Đảm bảo các trường JSON sạch sẽ, không chứa các tham chiếu trích dẫn hay dấu nguồn (như [cite] hoặc [source]).
- Khối mã JSON phản hồi BẮT BUỘC phải hoàn chỉnh và hợp lệ.`;
  } else {
    return `You are an expert CV and Cover Letter structuring assistant acting as a critical Engineering Manager. Your goal is to analyze job requirements and my background to generate a highly tailored, professional CV and Cover Letter in a single, valid JSON payload.

LANGUAGE RULES:
- You must perform the conversation, ask sharp questions, and interview me in ENGLISH.
- However, the final content inside the CV and Cover Letter fields in the output JSON must be written in the target CV language: **${targetLang}**. Do NOT translate the content back to English unless the target CV language is English.

Before generating the final JSON:
1. **Fit the Job Description (JD)**: You MUST ask me for the target Job Description (JD) first. Then, customize all details in the CV (especially the Objective, Experience, and Skills sections) to target and align with the JD as closely as possible.
2. **Identify Info Gaps**: If my experience or project descriptions are vague, lack strong action verbs, lack specific technical details, or lack measurable results (%, milliseconds, scale, saved revenue), you MUST STOP.
3. **Interrogate Me**: Switch to "Interrogation Mode" and ask direct, sharp, and specific questions in English based on the STAR methodology to extract those metrics. Do NOT fabricate information.
4. **Polish & Refine**: Only generate the final JSON when you are satisfied that my details prove high impact as a primary technical contributor.
5. **Use Strong Action Verbs**: Start every bullet point with strong active verbs (Architected, Engineered, Spearheaded, Optimized, etc.).
6. **No Duplicated Prefix**: Do NOT prepend words like "Project:" or "Context:" in any experience or project context header bullets (e.g. use **Altus Entertainment** instead of **Project: Altus Entertainment**).
7. **Enable Objective or Summary, prioritize Objective**: Enable either summary or objective, but not both. Prioritize objective and put summary in the disabledSections list by default (e.g. disabledSections: ['summary']).

When you are ready to export the final response, you MUST provide a valid JSON block matching the schema below, wrapped in a \`\`\`json ... \`\`\` code block. You can chat, give feedback, or explain briefly in English outside the JSON block, but ensure the JSON block is complete and copy-pasteable.

## Output JSON Schema
\`\`\`json
{
  "cv": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "location": "string (e.g. City, Country)",
    "linkedin": "string (full URL, e.g. https://linkedin.com/in/username)",
    "linkedin_placeholder": "string (short display name, e.g. linkedin.com/in/username)",
    "github": "string (full URL, e.g. https://github.com/username)",
    "github_placeholder": "string (short display name, e.g. github.com/username)",
    "website": "string (full URL)",
    "website_placeholder": "string (short display name)",
    "summary": "string (concise professional summary tailored to the role, no boilerplate/buzzwords)",
    "objective": "string (career objective, highly prioritized and tailored to target the job requirements to hook the recruiter with a strong value proposition)",
    "experiences": [
      {
        "position": "string",
        "company": "string",
        "location": "string (e.g. City, Country)",
        "dates": "string (e.g. October 2024 - Present or MM/YYYY - MM/YYYY)",
        "bullets": [
          {
            "id": "string (any unique short string, e.g. 'a1b2c3')",
            "type": "string ('l1' | 'l2' | 'l3' | 'header')",
            "text": "string (the bullet content, supports **bold**, *italic*, ***bolditalic***, <u>underline</u>)"
          }
        ]
      }
    ],
    "projects": [
      {
        "projectName": "string",
        "projectLink": "string (full URL)",
        "bullets": [
          {
            "id": "string (any unique short string, e.g. 'a1b2c3')",
            "type": "string ('l1' | 'l2' | 'l3' | 'header')",
            "text": "string (the bullet content, supports **bold**, *italic*, ***bolditalic***, <u>underline</u>)"
          }
        ]
      }
    ],
    "skills": [
      {
        "skill": "string (group name, e.g. Languages, Frameworks, Infrastructure)",
        "description": "string (comma-separated skills, e.g. JavaScript, Python, SQL)"
      }
    ],
    "educations": [
      {
        "university": "string",
        "degree": "string",
        "gpa": "string (optional, leave empty if weak or not provided)",
        "graduationDate": "string"
      }
    ],
    "certificates": [
      {
        "certName": "string",
        "issuer/description": "string",
        "certDate": "string"
      }
    ]
  },
  "coverLetter": {
    "header": {
      "senderName": "string (Sender's name - MUST be my name, e.g. Pham Bui Nam Phuong)",
      "senderEmail": "string (Sender's email)",
      "senderPhone": "string (Sender's phone)",
      "senderLocation": "string (Sender's city and country, e.g. Ho Chi Minh City, Viet Nam. DO NOT fill the recipient's name or company address here)",
      "date": "string (Date of writing, e.g. June 14, 2026)",
      "recipientName": "string (Recipient name, e.g. Hiring Manager)",
      "recipientTitle": "string (Recipient title, e.g. Engineering Manager)",
      "companyName": "string (Target company name, e.g. Tech Company)",
      "companyAddress": "string (Target company address, e.g. Ho Chi Minh City, Viet Nam. Fill company address here)"
    },
    "greeting": "string (e.g. Dear Hiring Manager, or Dear Mr. / Ms. [Name],)",
    "openingParagraph": "string (compelling opening expressing interest and matching job requirements, supports rich text)",
    "bodyParagraphs": [
      "string (supporting paragraph highlighting experience/achievements, supports rich text)",
      "string (supporting paragraph showing technical fit and soft skills, supports rich text)"
    ],
    "closingParagraph": "string (reiterate fit and propose next steps / interview, supports rich text)",
    "signOff": "string (e.g. Sincerely,\\n\\n[Name])"
  },
  "language": "string (exact target language name, e.g., 'English', 'Vietnamese', 'Japanese', 'Korean', 'Chinese')",
  "sizeMultiplier": 1.0,
  "customSectionLabels": {
    "summary": "string (translated label, e.g. 'Summary' or 'Tóm tắt')",
    "objective": "string (translated label, e.g. 'Objective' or 'Mục tiêu nghề nghiệp')",
    "skills": "string (translated label, e.g. 'Skills' or 'Kỹ năng')",
    "experience": "string (translated label, e.g. 'Experience' or 'Kinh nghiệm làm việc')",
    "projects": "string (translated label, e.g. 'Projects' or 'Dự án')",
    "education": "string (translated label, e.g. 'Education' or 'Học vấn')",
    "certificates": "string (translated label, e.g. 'Certificates' or 'Chứng chỉ')"
  },
  "sectionsOrder": [
    "summary",
    "objective",
    "skills",
    "experience",
    "projects",
    "education",
    "certificates"
  ],
  "disabledSections": ["summary"]
}
\`\`\`

## Section-Specific Guidelines
- **Contact Details**: Keep link placeholders short for previewing (e.g. github.com/username instead of the full URL).
- **Summary & Objective**: Customize to address the job description's main requirements. Focus on concrete accomplishments and years of experience. Prioritize objective.
- **Experience Bullets**:
  - Use \`type: "l1"\` for main accomplishments, \`type: "l2"\` for supporting details or metrics, \`type: "l3"\` for deep nested details, and \`type: "header"\` for a role overview/context header.
  - Each bullet must be a separate object in the \`bullets\` array with a unique \`id\`, a \`type\`, and the \`text\`.
  - Start l1 bullets with strong, active verbs in the past tense (or appropriate structure for the target language).
  - Write a natural overview context as a \`type: "header"\` entry if needed. Do NOT write "Context:" or "Project:" as a prefix.
  - **Bolding rule (CRITICAL)**: Bold MVP accomplishments, metrics, and business outcomes (e.g., **designed automated dispatch system**, **reduced response latency by 90%**). Do NOT bold technology or tool names in experience bullets (e.g., do NOT bold **React**, **FastAPI**, **Docker** in experience bullets).
- **Projects**:
  - Only list real, meaningful projects. Avoid boilerplate or trivial tutorial projects.
  - Use a \`type: "header"\` entry as the first bullet if a natural overview line is needed. Do NOT prepend "Context:" or "Project:" to it.
- **Skills**:
  - Group skills into logical categories (e.g., Languages, Frameworks, Databases & Storage, Infrastructure & Tools, Methodologies & Core Knowledge, Domain Knowledge).
  - In \`cv.skills.description\`, list the technologies/skills naturally. Bold 2-3 core tools/technologies (e.g., **ReactJS**, **FastAPI**) and fundamental conceptual keywords (e.g., **SOLID principles**, **OOP**, **Design Patterns**, **System Design**, **Unit Testing**, **A/B Testing**, **SDLC**) to create a strong visual highlight. Do NOT wrap the entire description in bold.
- **Education**: Omit GPA if it is low or not provided.
- **Certificates**: Ensure all relevant professional certificates and language scores (e.g., IELTS, TOEIC, AWS certificates) are listed.

## Rich Text Formatting Guidelines
- The editor supports standard Markdown inline formatting for rich text:
  - \`**bold**\` (renders as strong text)
  - \`*italic*\` (renders as emphasis text)
  - \`***bolditalic***\` (renders as bold and italicized)
  - \`<u>underline</u>\` (renders as underlined text)
- You MUST use these styles to highlight key achievements, MVP features, names, or metrics (but not technologies in experiences/projects) to make the CV look professional.
- Rich text formatting is fully supported and rendered in the following JSON fields:
  - \`cv.summary\`
  - \`cv.objective\`
  - \`text\` in \`cv.experiences[].bullets[].text\`
  - \`text\` in \`cv.projects[].bullets[].text\`
  - \`description\` in \`cv.skills\`
  - \`issuer/description\` in \`cv.certificates\`
- **Cover Letter Highlights**: In the cover letter paragraphs (\`coverLetter.openingParagraph\`, \`coverLetter.bodyParagraphs[]\`, \`coverLetter.closingParagraph\`), you are encouraged to use bold (\`**text**\`) or underline (\`<u>text</u>\`) formatting inline to highlight key metrics, technologies, or achievements to keep it consistent with the CV.

## Section Visibility & Ordering
- **Order Constraints**: The \`sectionsOrder\` list MUST ALWAYS contain all 7 keys. Do NOT omit any keys from this list. Arrange them logically.
- **Enable/Disable Sections**:
  - The \`disabledSections\` array controls which sections are hidden by default in the UI.
  - Do NOT disable the "objective" section by default. Ensure it is enabled and tailored to target the job requirements.
  - If a section contains no data, add its key to \`disabledSections\`. If it contains valid generated entries, ensure it is NOT listed in \`disabledSections\` so it is visible to the user.

## Formatting Constraints
- Respond with the JSON object wrapped in a single \`\`\`json code block.
- Do NOT insert citation references or citation markers (such as [cite], [source]) into any text fields. Output must be clean.`;
  }
})


// ─── SEO Settings & Preview ──────────────────────────────────────────────────
const isDev = import.meta.env.DEV
const seoTitle = computed(() => document.title)
const seoDescription = computed(() => {
  return document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
})
const seoKeywords = computed(() => {
  return document.querySelector('meta[name="keywords"]')?.getAttribute('content') || ''
})
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    side="right"
    :overlay="true"
    :modal="true"
    :title="t('settings_title')"
  >
    <template #body>
      <div class="space-y-6 text-theme-text-sub">
        <!-- ── Prompt Helper ── -->
        <section class="space-y-3">
          <h3
            class="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-3.5 h-3.5 text-primary-500"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.813 15.904L9 21l5.096-.813a2 2 0 001.414-.586l4.904-4.904a2 2 0 00-2.828-2.828l-4.904 4.904a2 2 0 00-.586 1.414z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M14.5 9.5h.008v.008H14.5V9.5zm3.5 0h.008v.008H18V9.5zm-7 0H11v.008h-.008V9.5zm0-3.5h.008v.008H11V6zm3.5 0h.008v.008H14.5V6zm3.5 0H18v.008h-.008V6z"
              />
            </svg>
            {{ t('prompt_helper_title') }}
          </h3>
          <p class="text-xs text-theme-text-muted leading-relaxed">{{ t('prompt_helper_desc') }}</p>
          <textarea
            class="w-full font-mono text-[10px] bg-theme-muted border border-theme-border rounded-lg p-2.5 text-theme-text-sub focus:outline-none focus:border-theme-border resize-none h-32 shadow-sm"
            readonly
            :value="promptTemplate"
          ></textarea>
          <button
            @click="copyPrompt"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-element hover:bg-theme-hover border border-theme-border text-theme-text-sub hover:text-theme-text rounded-lg text-xs font-bold transition cursor-pointer shadow-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-3.5 h-3.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 1-2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z"
              />
            </svg>
            {{ t(copyBtnText as any) }}
          </button>
        </section>



        <!-- ── Load JSON ── -->
        <section class="space-y-3">
          <h3
            class="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-3.5 h-3.5 text-primary-600 dark:text-primary-400"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
              />
            </svg>
            {{ t('json_input_title') }}
          </h3>
          <label class="block text-xs text-theme-text-muted">{{ t('json_input_label') }}</label>
          <textarea
            id="json-input"
            v-model="jsonInputValue"
            class="w-full font-mono text-[10px] bg-theme-card border border-theme-border rounded-lg p-2.5 text-theme-text focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 h-28 resize-none shadow-sm"
            :placeholder="`{ &quot;cv&quot;: { ... }, &quot;coverLetter&quot;: { ... } }`"
          ></textarea>
          <div class="flex items-center gap-3">
            <button
              id="load-json-text-btn"
              @click="loadJsonFromText"
              class="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 dark:hover:bg-primary-500 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-md"
            >
              {{ t('load_json') }}
            </button>
            <span
              v-if="jsonLoadError"
              class="text-xs text-rose-500 dark:text-rose-400 font-semibold"
              >{{ t(jsonLoadError as any) }}</span
            >
            <span
              v-if="jsonLoadSuccess"
              class="text-xs text-primary-600 dark:text-primary-400 font-semibold"
              >{{ t('loaded_success') }}</span
            >
          </div>
        </section>

        <hr class="border-theme-sub" />

        <!-- ── About Us ── -->
        <section class="space-y-3">
          <h3
            class="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-3.5 h-3.5 text-primary-600 dark:text-primary-400"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.978 11.978 0 0 1 12 20.25a11.968 11.968 0 0 1-3.008-.386V19.12c0-1.113.285-2.16.786-3.07M12 20.25a11.978 11.978 0 0 1-3.008-.386M3.375 19.4a9.339 9.339 0 0 0 4.125.953 9.379 9.379 0 0 0 2.625-.372M6.75 20.25v-1.13a11.975 11.975 0 0 1 3.008-.387m-3.008.387A11.967 11.967 0 0 1 3.743 19.5a4.125 4.125 0 0 1 7.53-2.493m-4.526 2.117v.003"
              />
            </svg>
            {{ t('about_us') }}
          </h3>
          <div v-if="githubProfiles.length > 0" class="space-y-3 mt-2">
            <a
              v-for="profile in githubProfiles"
              :key="profile.login"
              :href="profile.html_url"
              target="_blank"
              class="group block p-4 bg-theme-card border border-theme-border/60 hover:border-primary-500 rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <div class="flex items-center gap-3">
                <img
                  :src="profile.avatar_url"
                  :alt="profile.name || profile.login"
                  class="w-12 h-12 rounded-full border border-theme-border/60 group-hover:border-primary-500 transition-colors"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between">
                    <h4 class="text-sm font-bold text-theme-text group-hover:text-primary-500 transition-colors truncate">
                      {{ profile.name || profile.login }}
                    </h4>
                    <span class="text-[10px] text-theme-text-muted font-mono bg-theme-muted group-hover:bg-primary-500/10 group-hover:text-primary-500 px-1.5 py-0.5 rounded transition-colors">
                      @{{ profile.login }}
                    </span>
                  </div>
                  <!-- Role Badge -->
                  <div class="flex items-center gap-1.5 mt-0.5 mb-1">
                    <span class="text-[9px] font-extrabold tracking-wide uppercase px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 border border-primary-200/40 dark:border-primary-900/30">
                      {{ profile.login.toLowerCase() === 'sjnosukequy' ? t('role_creator') : t('role_developer') }}
                    </span>
                  </div>
                  <p class="text-xs text-theme-text-muted line-clamp-1" :title="profile.bio || ''">
                    {{ profile.bio || t('developer_fallback') }}
                  </p>
                </div>
              </div>

              <div class="flex items-center justify-between mt-3 pt-3 border-t border-theme-sub/40 text-[11px]">
                <div class="flex items-center gap-4 text-theme-text-sub">
                  <span class="flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 text-theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span class="font-semibold text-theme-text">{{ profile.public_repos }}</span> {{ t('repos') }}
                  </span>
                  <span class="flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 text-theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span class="font-semibold text-theme-text">{{ profile.followers }}</span> {{ t('followers') }}
                  </span>
                </div>
                <span class="text-primary-500 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  {{ t('view_profile') }}
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </a>
          </div>
          <div v-else class="space-y-3 mt-2">
            <a
              href="https://github.com/sjnosukequy"
              target="_blank"
              class="group block p-4 bg-theme-card border border-theme-border/60 hover:border-primary-500 rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full border border-theme-border/60 group-hover:border-primary-500 transition-colors bg-theme-muted flex items-center justify-center text-theme-text-muted">
                  <svg class="w-6 h-6" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between">
                    <h4 class="text-sm font-bold text-theme-text group-hover:text-primary-500 transition-colors">
                      sjnosukequy
                    </h4>
                    <span class="text-[10px] text-theme-text-muted font-mono bg-theme-muted group-hover:bg-primary-500/10 group-hover:text-primary-500 px-1.5 py-0.5 rounded transition-colors">
                      @sjnosukequy
                    </span>
                  </div>
                  <!-- Role Badge -->
                  <div class="flex items-center gap-1.5 mt-1">
                    <span class="text-[9px] font-extrabold tracking-wide uppercase px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 border border-primary-200/40 dark:border-primary-900/30">
                      {{ t('role_creator') }}
                    </span>
                  </div>
                </div>
              </div>
            </a>
            <a
              href="https://github.com/Phuongp2003"
              target="_blank"
              class="group block p-4 bg-theme-card border border-theme-border/60 hover:border-primary-500 rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full border border-theme-border/60 group-hover:border-primary-500 transition-colors bg-theme-muted flex items-center justify-center text-theme-text-muted">
                  <svg class="w-6 h-6" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between">
                    <h4 class="text-sm font-bold text-theme-text group-hover:text-primary-500 transition-colors">
                      Phuongp2003
                    </h4>
                    <span class="text-[10px] text-theme-text-muted font-mono bg-theme-muted group-hover:bg-primary-500/10 group-hover:text-primary-500 px-1.5 py-0.5 rounded transition-colors">
                      @Phuongp2003
                    </span>
                  </div>
                  <!-- Role Badge -->
                  <div class="flex items-center gap-1.5 mt-1">
                    <span class="text-[9px] font-extrabold tracking-wide uppercase px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 border border-primary-200/40 dark:border-primary-900/30">
                      {{ t('role_developer') }}
                    </span>
                  </div>
                </div>
              </div>
            </a>
          </div>
        </section>
      </div>
    </template>
  </USlideover>
</template>
