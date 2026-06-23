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
    reset_sample: 'Load Sample',
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
    image_hint: 'PNG, JPEG, WEBP. Max 5MB.',
    url_auto_https: '(adds https:// if missing)',
    github_display: 'GitHub Display Text (Preview)',
    linkedin_display: 'LinkedIn Display Text (Preview)',
    website_display: 'Website Display Text (Preview)',
    github_placeholder_eg: 'e.g. github.com/username',
    linkedin_placeholder_eg: 'e.g. linkedin.com/in/username',
    website_placeholder_eg: 'e.g. mywebsite.com',
    image_type_error: 'Unsupported image type. Please upload PNG, JPEG, or WEBP.',
    image_size_error: 'Image is too large. Maximum size is 5MB.',

    // Summary / Objective
    summary_title: 'Professional Summary',
    summary_placeholder: 'Tailored summary (2-3 sentences)',
    objective_title: 'Career Objective',
    objective_placeholder: 'Career objective...',

    // Skills
    skills_title: 'Skills',
    skill_name: 'Skill Name',
    skill_name_eg: 'e.g. Languages',
    skill_desc: 'Description',
    add_skill: 'Add Skill',
    delete: 'Delete',
    new_skill_group: 'New Skill Group',

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
    exp_header_style: 'Job Header Style',
    style_classic: 'Company, Location, Position',
    style_role_company: 'Role & Company (Omit Location)',
    custom_headings: 'Custom Section Headings',
    bullet_chars: 'Bullet Characters',

    // UI Language
    ui_language: 'UI Language',
    about_us: 'About Us',
    role_creator: 'Initiated & Designed',
    role_developer: 'Expanded & Co-developed',

    // Layout
    adjust_layout: 'Adjust Layout',
    edit_content_mode: 'Edit Content',
    layout_help: 'Drag and drop sections to rearrange their order, click the eye icon to toggle visibility, or edit titles directly. Changes are applied instantly!',
    required: 'Required',
    moving_section: 'Moving Section',
    layout_desc: 'Drag & drop sections to arrange layout',
    content_desc: 'Enter detail information for your CV',

    // Outline Mode navigation
    nav_jump_to: 'Jump to:',
    nav_position: 'Position',

    // Presets
    preset_manage: 'Manage profile presets',
    preset_btn: 'Presets',
    preset_title: 'Profile Slots (Presets)',
    preset_select_slot: 'Select Save Slot',
    preset_empty: 'Empty',
    preset_slot: 'Slot',
    preset_save_current: 'Save Current',
    preset_load: 'Load Preset',
    preset_delete: 'Delete',
    preset_saved_to_slot: 'Saved to Slot {slot}!',
    preset_slot_empty: 'Slot {slot} is empty!',
    preset_loaded_from_slot: 'Loaded from Slot {slot}!',
    preset_already_empty: 'Slot {slot} is already empty!',
    preset_deleted_slot: 'Deleted Slot {slot}!',

    // Explicit headings & actions
    edit_personal_info: 'Edit Personal Info',
    edit_section_title: 'Edit {section}',
    tabs_mode_label: 'Tabs',
    outline_mode_label: 'Outline',
    formatting_settings: 'Formatting Settings',
    drag_to_reorder_help: 'Drag to reorder',

    // Placeholders
    new_project: 'New Project',
    new_company: 'New Company',
    experience_card: 'Experience Card',
    new_university: 'New University',
    education_card: 'Education Card',
    new_certificate: 'New Certificate',

    // About Us / GitHub card
    view_profile: 'View Profile',
    repos: 'repos',
    followers: 'followers',
    developer_fallback: 'Developer',

    // Layout section visibility
    section_hide: 'Hide section',
    section_show: 'Show section',
    pdf_preview_title: 'CV PDF Preview',

    // Cover Letter Workspace
    cover_letter_workspace: 'Cover Letter',
    cv_workspace: 'CV Workspace',
    cl_sender_info: 'Sender Information',
    cl_recipient_info: 'Recipient Information',
    cl_date: 'Date',
    cl_recipient_name: 'Recipient Name',
    cl_recipient_title: 'Recipient Title',
    cl_company_name: 'Company Name',
    cl_company_address: 'Company Address',
    cl_greeting: 'Greeting / Salutation',
    cl_opening_p: 'Opening Paragraph',
    cl_body_ps: 'Body Paragraphs',
    cl_closing_p: 'Closing Paragraph',
    cl_signoff: 'Sign-off & Signature',
    cl_sync_btn: 'Sync from CV',
    cl_copy_btn: 'Copy Text',
    cl_add_p_btn: '+ Add Paragraph',
    cl_copy_success: 'Copied Cover Letter to clipboard!',
    cl_preview_title: 'Cover Letter PDF Preview',
    cl_richtext_help: 'Supports rich text formatting using Markdown syntax: **bold**, *italic*, ***bolditalic***, and <u>underline</u>.',
    cl_recipient_email: 'Recipient Email',
    cl_quick_email_btn: 'Send Email',
    cl_quick_email_title: 'Quick Email Compose',
    email_subject_label: 'Subject',
    email_account_label: 'Gmail Account / Mail Client',
    email_client_mailto: 'Default Mail App (mailto:)',
    email_copy_notice: 'Tip: The formatted rich-text letter body will be automatically copied to your clipboard. Simply press Ctrl+V inside your email client compose window to paste it!',
    email_send_compose: 'Compose Email',
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
    image_hint: 'PNG, JPEG, WEBP. Tối đa 5MB.',
    url_auto_https: '(tự thêm https:// nếu thiếu)',
    github_display: 'Văn bản hiển thị GitHub (Preview)',
    linkedin_display: 'Văn bản hiển thị LinkedIn (Preview)',
    website_display: 'Văn bản hiển thị Website (Preview)',
    github_placeholder_eg: 'vd: github.com/username',
    linkedin_placeholder_eg: 'vd: linkedin.com/in/username',
    website_placeholder_eg: 'vd: mywebsite.com',
    image_type_error: 'Định dạng ảnh không hỗ trợ. Vui lòng tải lên PNG, JPEG hoặc WEBP.',
    image_size_error: 'Ảnh quá lớn. Kích thước tối đa là 5MB.',

    // Summary / Objective
    summary_title: 'Tóm tắt nghề nghiệp',
    summary_placeholder: 'Tóm tắt ngắn gọn (2-3 câu)',
    objective_title: 'Mục tiêu nghề nghiệp',
    objective_placeholder: 'Mục tiêu nghề nghiệp...',

    // Skills
    skills_title: 'Kỹ năng',
    skill_name: 'Tên kỹ năng',
    skill_name_eg: 'vd: Ngôn ngữ lập trình',
    skill_desc: 'Mô tả',
    add_skill: 'Thêm kỹ năng',
    delete: 'Xoá',
    new_skill_group: 'Nhóm kỹ năng mới',

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
    exp_header_style: 'Kiểu tiêu đề công việc',
    style_classic: 'Công ty, Địa điểm & Chức danh',
    style_role_company: 'Chức danh & Công ty (Bỏ địa chỉ)',
    custom_headings: 'Tiêu đề mục tùy chỉnh',
    bullet_chars: 'Ký hiệu đầu mục',

    // UI Language
    ui_language: 'Ngôn ngữ giao diện',
    about_us: 'Về chúng tôi',
    role_creator: 'Khởi xướng & Thiết kế',
    role_developer: 'Mở rộng & Phát triển',

    // Layout
    adjust_layout: 'Chỉnh Bố Cục',
    edit_content_mode: 'Sửa Nội Dung',
    layout_help: 'Kéo thả các mục bên dưới để sắp xếp thứ tự hiển thị trực quan trên CV, bật/tắt mắt hiển thị hoặc đổi tên nhãn tiêu đề. Mọi thay đổi sẽ áp dụng ngay tức thì!',
    required: 'Bắt Buộc',
    moving_section: 'Đang Di Chuyển',
    layout_desc: 'Kéo thả để sắp xếp các mục hiển thị',
    content_desc: 'Nhập thông tin chi tiết cho CV của bạn',

    // Outline Mode navigation
    nav_jump_to: 'Bản đồ mục:',
    nav_position: 'Vị trí',

    // Presets
    preset_manage: 'Quản lý các bản lưu hồ sơ',
    preset_btn: 'Hồ Sơ Lưu',
    preset_title: 'Lưu hồ sơ (Presets)',
    preset_select_slot: 'Chọn ô lưu',
    preset_empty: 'Trống',
    preset_slot: 'Ô lưu',
    preset_save_current: 'Lưu hiện tại',
    preset_load: 'Tải hồ sơ',
    preset_delete: 'Xoá',
    preset_saved_to_slot: 'Đã lưu vào ô {slot}!',
    preset_slot_empty: 'Ô {slot} đang trống!',
    preset_loaded_from_slot: 'Đã tải từ ô {slot}!',
    preset_already_empty: 'Ô {slot} đã trống sẵn rồi!',
    preset_deleted_slot: 'Đã xóa ô {slot}!',

    // Explicit headings & actions
    edit_personal_info: 'Chỉnh sửa thông tin cá nhân',
    edit_section_title: 'Chỉnh sửa {section}',
    tabs_mode_label: 'Dạng Tab',
    outline_mode_label: 'Dạng Cuộn',
    formatting_settings: 'Cấu hình định dạng',
    drag_to_reorder_help: 'Kéo để sắp xếp',

    // Placeholders
    new_project: 'Dự án mới',
    new_company: 'Công ty mới',
    experience_card: 'Thẻ kinh nghiệm',
    new_university: 'Trường mới',
    education_card: 'Thẻ học vấn',
    new_certificate: 'Chứng chỉ mới',

    // About Us / GitHub card
    view_profile: 'Xem trang cá nhân',
    repos: 'repos',
    followers: 'người theo dõi',
    developer_fallback: 'Lập trình viên',

    // Layout section visibility
    section_hide: 'Ẩn mục',
    section_show: 'Hiện mục',
    pdf_preview_title: 'Xem trước CV PDF',

    // Cover Letter Workspace
    cover_letter_workspace: 'Thư giới thiệu',
    cv_workspace: 'Hồ sơ CV',
    cl_sender_info: 'Thông tin người gửi',
    cl_recipient_info: 'Thông tin người nhận',
    cl_date: 'Ngày viết',
    cl_recipient_name: 'Tên người nhận',
    cl_recipient_title: 'Chức vụ người nhận',
    cl_company_name: 'Tên công ty',
    cl_company_address: 'Địa chỉ công ty',
    cl_greeting: 'Lời chào đầu thư',
    cl_opening_p: 'Đoạn mở đầu',
    cl_body_ps: 'Các đoạn thân bài',
    cl_closing_p: 'Đoạn kết luận',
    cl_signoff: 'Lời chào kết & Ký tên',
    cl_sync_btn: 'Đồng bộ từ CV',
    cl_copy_btn: 'Sao chép văn bản',
    cl_add_p_btn: '+ Thêm đoạn văn',
    cl_copy_success: 'Đã sao chép thư giới thiệu vào bộ nhớ tạm!',
    cl_preview_title: 'Xem trước Thư PDF',
    cl_richtext_help: 'Hỗ trợ định dạng văn bản bằng cú pháp Markdown: **in đậm**, *in nghiêng*, ***đậm & nghiêng***, và <u>gạch chân</u>.',
    cl_recipient_email: 'Email người nhận',
    cl_quick_email_btn: 'Gửi Email',
    cl_quick_email_title: 'Soạn thảo Email nhanh',
    email_subject_label: 'Tiêu đề thư',
    email_account_label: 'Tài khoản Gmail / Trình gửi mail',
    email_client_mailto: 'Trình gửi mặc định (mailto:)',
    email_copy_notice: 'Mẹo: Nội dung thư giới thiệu định dạng Rich-text sẽ tự động được sao chép vào bộ nhớ tạm. Bạn chỉ cần nhấn Ctrl+V (hoặc Cmd+V) trong cửa sổ soạn thảo email để dán thư với định dạng đẹp mắt!',
    email_send_compose: 'Mở cửa sổ soạn thư',
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
