# Content contract

`content.json` is the AI writing artifact. It contains no font, template, size or other format option.

```json
{
  "cv": {
    "name": "Candidate Name",
    "title": "",
    "email": "name@example.com",
    "phone": "+84 ...",
    "location": "Ho Chi Minh City, Vietnam",
    "summary": "Role, experience, strongest proof.",
    "objective": "",
    "experiences": [{ "position": "Developer", "company": "Example", "location": "", "dates": "01/2024 - 11/2026", "bullets": [{ "id": "e1", "type": "l1", "text": "Action, mechanism and result." }] }],
    "projects": [{ "projectName": "Named project", "projectLink": "", "overview": "A real description of the product, domain, users, purpose and verified scope.", "dates": "2025 - 2026", "technologies": "C# · Python", "bullets": [{ "id": "p1", "type": "l1", "text": "Candidate's role, contribution and outcome." }] }],
    "projectIntro": "Selected projects at Example",
    "skills": [{ "skill": "Backend", "description": "C#, Python" }],
    "educations": [],
    "certificates": [],
    "customSections": [{ "id": "publications", "title": "Publications", "preset": "experience", "experienceStyle": "hierarchy", "showCompanyDates": true, "showPosition": false, "showPositionDates": false, "entries": [{ "position": "Paper title", "positionDates": "", "company": "Venue", "location": "", "dates": "2026", "bullets": [{ "id": "c1", "type": "l1", "text": "Contribution." }] }] }]
  },
  "layout": {
    "sectionsOrder": ["summary", "experience", "skills", "education", "projects", "custom:publications", "page-break", "certificates", "objective"],
    "disabledSections": ["objective"],
    "sectionLabels": { "projects": "Selected Projects" }
  }
}
```
Use the optional `page-break` entry in `layout.sectionsOrder` before a section that should start on a fresh page. It is a layout marker: it adds no heading or content and can be moved in the editor's section list.
Built-in content sections: `summary`, `objective`, `experience`, `skills`, `education`, `projects`, `certificates`. `page-break` is a layout-only marker and may appear once in `sectionsOrder`. A custom section key is `custom:<id>` and must match one item in `cv.customSections`. Custom sections select a `summary`, `experience`, or `skills` preset. Experience preset entries use company as H2, optionally show company dates, and may show job title as H3 with its own optional dates; put bullets and description under the lowest enabled heading. Other experience styles can inherit the global style or choose classic, role-company, or one-line. Older custom sections without a preset stay on the inherited Experience style. The user may add any number of custom sections. `coverLetter` is optional and follows the website schema.

Write bullets as context or problem, personal action, mechanism and verifiable result. Prefer named products and concrete behavior. Distinguish shipped work from feature-branch or lab work. Projects are a supporting section for product-level context and evidence; use them for substantial systems even when the work was done at an employer. Each substantial project needs an accurate overview that tells the reader what the real system does, its domain and users, purpose, verified scale/scope and where the candidate worked in it. Use contribution bullets to make personal ownership and outcomes clear. The overview is project context, not a substitute for the candidate's role, and must not repeat Experience bullets.

Keep section labels editable in `layout.sectionLabels`. Use compact one-word labels by default when the candidate has no preference, and preserve any label the candidate customizes. The candidate's requested section order, length and role grouping override generic defaults. When the candidate asks to group a promotion or internship period under a main role, use one Experience entry and summarize earlier-period work in one bullet while keeping the dates truthful.

Preserve verified titles and dates, then follow the candidate's requested display. If they ask to group a promotion or internship period under one main Experience entry, use one entry and summarize earlier-period work in one clearly worded bullet without implying the later title applied before its verified start date.

Project order is mandatory: sort the included projects in reverse chronological order by end date, newest first; use the later start date to break ties. Select projects for JD relevance, then restore chronological order. Use verified dates and ask when dates are missing or unclear; never guess. Each project should include a name/date, a real overview of the product/domain/users and known scope, one compact `Technologies:` line with relevant tools, and focused contribution bullets that explain the candidate's role and work. Keep product context in the overview and the candidate's work in the bullets. Do not split one system into unrelated feature-sized projects.

`layout.sectionsOrder` controls section position, `layout.sectionLabels` controls editable headings, and `page-break` is a layout-only marker inserted before the section that should begin on a new page. Custom sections use `custom:<id>` and one of the supported content presets. These are CV content/layout controls, not formatting config.
