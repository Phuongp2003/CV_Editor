import { computed } from 'vue'
import { useCVStore } from '@/stores/cv'
import { storeToRefs } from 'pinia'

// ─── Translation Dictionary ────────────────────────────────────────────────────

const translations = {
  English: {
    // App / Navbar
    app_title: 'CV Workspace & Editor',
    simple_version: 'Simple Version',
    settings_btn: 'More Features',
    download_btn: 'Download',
    reset_sample: 'Reset to Sample',
    lang_toggle: 'Language',

    // Editor
    editor_title: 'CV Form Editor',
    layout_step_label: 'STEP 1 OF 2',
    content_step_label: 'STEP 2 OF 2',
    layout_step_title: 'Layout & Sections Structure',
    layout_step_desc:
      'Drag sections to rearrange order in the PDF. Toggle visibility, rename headers, and click Edit to fill content.',
    back_to_layout: 'Back to Layout',
    tab_mode: 'Tab Mode',
    outline_mode: 'Outline Mode',
    switch_outline: 'Outline',
    switch_tabs: 'Tabs',

    // Sections
    personal_info: 'Personal Information',
    edit_content: 'Edit Content',
    bullet_symbols: 'Bullet Symbols',
    section_labels: 'Section Labels',

    // Personal Form
    full_name: 'Full Name',
    email: 'Email',
    phone: 'Phone',
    location: 'Location',
    github_link: 'GitHub Link',
    linkedin_link: 'LinkedIn Link',
    website: 'Personal Website',
    profile_picture: 'Profile Picture (optional)',
    choose_image: 'Choose Image',
    remove_image: 'Remove',

    // Summary / Objective
    summary_title: 'Professional Summary',
    summary_placeholder: 'Tailored summary (2-3 sentences)',
    objective_title: 'Career Objective',
    objective_placeholder: 'Career objective...',

    // Skills
    skills_title: 'Skills',
    skill_name: 'Skill Name',
    skill_desc: 'Description',
    add_skill: 'Add Skill',
    delete: 'Delete',

    // Experience
    experience_title: 'Experience',
    position: 'Position',
    company: 'Company',
    exp_location: 'Location (optional)',
    dates: 'Dates',
    bullets_placeholder: 'Bullet points...',
    bullets_help: 'Use # for header, - for level 1 bullets, + for level 2 bullets.',
    add_experience: 'Add Experience',
    bullet_header: 'Bullet Points & Headers',
    no_bullets: 'No bullets added. Click below to add points.',
    btn_add_l1: '+ L1 Bullet',
    btn_add_l2: '+ L2 Bullet',
    btn_add_l3: '+ L3 Bullet',
    btn_add_header: '+ Header',
    option_header: 'Header',
    option_l1: 'L1 Bullet (•)',
    option_l2: 'L2 Bullet (◦)',
    option_l3: 'L3 Bullet (▪)',
    bullet_editor_placeholder: 'Enter text (supports **bold**, *italic*)',

    // Projects
    projects_title: 'Projects',
    project_name: 'Project Name',
    project_link: 'Link (optional)',
    add_project: 'Add Project',
    drag_to_reorder: 'Drag to Reorder',
    delete_card: 'Delete Card',
    drag_moving: 'Moving',

    // Education
    education_title: 'Education',
    university: 'University',
    degree: 'Degree',
    gpa: 'GPA (optional)',
    graduation: 'Graduation Date',
    add_education: 'Add Education',

    // Certificates
    certificates_title: 'Certifications',
    cert_name: 'Certification Name',
    cert_issuer: 'Issuer / Description',
    cert_date: 'Certification Date',
    add_certificate: 'Add Certification',

    // Download Menu
    download_pdf: 'Download PDF',
    download_json: 'Download JSON',
    download_html: 'Download HTML',
    download_docx: 'Download DOCX',
    coming_soon: 'Coming soon',

    // Settings Drawer
    settings_title: 'More Features',
    settings_close: 'Close',

    // AI Prompt
    prompt_helper_title: 'Prompt Helper (for AI tools)',
    prompt_helper_desc:
      'Use this prompt in your AI tool (ChatGPT, Gemini, etc.). It should reply with a single JSON code block that you can paste back.',
    copy_prompt: 'Copy prompt',
    copied: 'Copied!',
    expand: 'Expand',
    collapse: 'Collapse',

    // JSON Input
    json_input_title: 'Load CV from JSON',
    json_input_label: 'Paste CV JSON from AI (or other tools)',
    load_json: 'Load CV from JSON',
    no_json: 'No JSON provided',
    invalid_format: "Invalid format: missing 'cv' field",
    invalid_json: 'Invalid JSON',
    loaded_success: 'Loaded CV JSON successfully!',

    // PDF Options
    pdf_options_title: 'PDF Options',
    cv_language: 'CV Language',
    font_family: 'Font Family',
    font_notosans: 'Basic (NotoSans)',
    font_arial: 'Arial',
    font_custom: 'Custom System Font',
    custom_font_name: 'Custom Font Name',
    custom_font_placeholder: 'e.g. Times New Roman',
    size_multiplier: 'Size Multiplier',
    download_options_title: 'Download Configuration',
    file_name: 'File Name',
    download_confirm: 'Download',
    cancel: 'Cancel',
    style_formatting_options: 'Style & Formatting Options',
    custom_headings: 'Custom Section Headings',
    bullet_chars: 'Bullet Characters',

    // UI Language
    ui_language: 'UI Language',
    about_us: 'About Us',
    role_creator: 'Initiated & Designed',
    role_developer: 'Expanded & Co-developed',
  },

  Vietnamese: {
    // App / Navbar
    app_title: 'CV Workspace & Editor',
    simple_version: 'Bản cũ (Simple)',
    settings_btn: 'Tính năng khác',
    download_btn: 'Tải xuống',
    reset_sample: 'Tải dữ liệu mẫu',
    lang_toggle: 'Ngôn ngữ',

    // Editor
    editor_title: 'Trình soạn thảo CV',
    layout_step_label: 'BƯỚC 1 / 2',
    content_step_label: 'BƯỚC 2 / 2',
    layout_step_title: 'Bố cục & Cấu trúc Mục',
    layout_step_desc:
      'Kéo để sắp xếp thứ tự mục trong PDF. Bật/tắt hiển thị, đổi tên tiêu đề, và nhấn Chỉnh sửa để điền nội dung.',
    back_to_layout: 'Quay lại Bố cục',
    tab_mode: 'Chế độ Tab',
    outline_mode: 'Chế độ Đề cương',
    switch_outline: 'Đề cương',
    switch_tabs: 'Tab',

    // Sections
    personal_info: 'Thông tin cá nhân',
    edit_content: 'Chỉnh sửa',
    bullet_symbols: 'Ký hiệu gạch đầu dòng',
    section_labels: 'Nhãn tiêu đề mục',

    // Personal Form
    full_name: 'Họ và tên',
    email: 'Email',
    phone: 'Số điện thoại',
    location: 'Địa điểm',
    github_link: 'Đường dẫn GitHub',
    linkedin_link: 'Đường dẫn LinkedIn',
    website: 'Website cá nhân',
    profile_picture: 'Ảnh đại diện (không bắt buộc)',
    choose_image: 'Chọn ảnh',
    remove_image: 'Xoá ảnh',

    // Summary / Objective
    summary_title: 'Tóm tắt nghề nghiệp',
    summary_placeholder: 'Tóm tắt ngắn gọn (2-3 câu)',
    objective_title: 'Mục tiêu nghề nghiệp',
    objective_placeholder: 'Mục tiêu nghề nghiệp...',

    // Skills
    skills_title: 'Kỹ năng',
    skill_name: 'Tên kỹ năng',
    skill_desc: 'Mô tả',
    add_skill: 'Thêm kỹ năng',
    delete: 'Xoá',

    // Experience
    experience_title: 'Kinh nghiệm làm việc',
    position: 'Vị trí',
    company: 'Công ty',
    exp_location: 'Địa điểm (không bắt buộc)',
    dates: 'Thời gian',
    bullets_placeholder: 'Gạch đầu dòng...',
    bullets_help: 'Dùng # cho tiêu đề, - cho gạch đầu dòng cấp 1, + cho cấp 2.',
    add_experience: 'Thêm kinh nghiệm',
    bullet_header: 'Gạch đầu dòng & Tiêu đề',
    no_bullets: 'Chưa có gạch đầu dòng nào. Nhấn phía dưới để thêm.',
    btn_add_l1: '+ Dòng cấp 1',
    btn_add_l2: '+ Dòng cấp 2',
    btn_add_l3: '+ Dòng cấp 3',
    btn_add_header: '+ Tiêu đề',
    option_header: 'Tiêu đề',
    option_l1: 'Dòng cấp 1 (•)',
    option_l2: 'Dòng cấp 2 (◦)',
    option_l3: 'Dòng cấp 3 (▪)',
    bullet_editor_placeholder: 'Nhập văn bản (hỗ trợ **chữ in đậm**, *chữ in nghiêng*)',

    // Projects
    projects_title: 'Dự án',
    project_name: 'Tên dự án',
    project_link: 'Đường dẫn (không bắt buộc)',
    add_project: 'Thêm dự án',
    drag_to_reorder: 'Kéo để sắp xếp',
    delete_card: 'Xoá thẻ',
    drag_moving: 'Đang di chuyển',

    // Education
    education_title: 'Học vấn',
    university: 'Trường / Học viện',
    degree: 'Bằng cấp',
    gpa: 'GPA (không bắt buộc)',
    graduation: 'Thời gian tốt nghiệp',
    add_education: 'Thêm học vấn',

    // Certificates
    certificates_title: 'Chứng chỉ',
    cert_name: 'Tên chứng chỉ',
    cert_issuer: 'Đơn vị cấp / Mô tả',
    cert_date: 'Ngày cấp',
    add_certificate: 'Thêm chứng chỉ',

    // Download Menu
    download_pdf: 'Tải PDF',
    download_json: 'Tải JSON',
    download_html: 'Tải HTML',
    download_docx: 'Tải DOCX',
    coming_soon: 'Sắp ra mắt',

    // Settings Drawer
    settings_title: 'Tính năng khác',
    settings_close: 'Đóng',

    // AI Prompt
    prompt_helper_title: 'Prompt gợi ý (cho công cụ AI)',
    prompt_helper_desc:
      'Dùng prompt này trong công cụ AI (ChatGPT, Gemini, ...). AI nên trả về một code block JSON để dán vào editor.',
    copy_prompt: 'Sao chép prompt',
    copied: 'Đã sao chép!',
    expand: 'Mở rộng',
    collapse: 'Thu gọn',

    // JSON Input
    json_input_title: 'Tải CV từ JSON',
    json_input_label: 'Dán CV JSON từ AI (hoặc công cụ khác)',
    load_json: 'Tải CV từ JSON',
    no_json: 'Chưa nhập JSON',
    invalid_format: "Định dạng không hợp lệ: thiếu trường 'cv'",
    invalid_json: 'JSON không hợp lệ',
    loaded_success: 'Đã tải CV JSON thành công!',

    // PDF Options
    pdf_options_title: 'Tuỳ chọn PDF',
    cv_language: 'Ngôn ngữ CV',
    font_family: 'Font chữ',
    font_notosans: 'Cơ bản (NotoSans)',
    font_arial: 'Arial',
    font_custom: 'Font hệ thống tuỳ chỉnh',
    custom_font_name: 'Tên font tuỳ chỉnh',
    custom_font_placeholder: 'vd: Times New Roman',
    size_multiplier: 'Tỷ lệ cỡ chữ',
    download_options_title: 'Cấu hình tải xuống',
    file_name: 'Tên tệp',
    download_confirm: 'Tải xuống',
    cancel: 'Hủy',
    style_formatting_options: 'Tùy chọn kiểu dáng & định dạng',
    custom_headings: 'Tiêu đề mục tùy chỉnh',
    bullet_chars: 'Ký hiệu đầu mục',

    // UI Language
    ui_language: 'Ngôn ngữ giao diện',
    about_us: 'Về chúng tôi',
    role_creator: 'Khởi xướng & Thiết kế',
    role_developer: 'Mở rộng & Phát triển',
  },
} as const

type Lang = keyof typeof translations
type TransKey = keyof (typeof translations)['English']

// ─── Composable ───────────────────────────────────────────────────────────────

export function useI18n() {
  const store = useCVStore()
  const { uiLanguage } = storeToRefs(store)

  function t(key: TransKey): string {
    const lang = (uiLanguage.value as Lang) in translations ? (uiLanguage.value as Lang) : 'English'
    return (translations[lang] as any)[key] ?? (translations['English'] as any)[key] ?? key
  }

  const currentLang = computed(() => uiLanguage.value)

  return { t, currentLang, uiLanguage }
}
