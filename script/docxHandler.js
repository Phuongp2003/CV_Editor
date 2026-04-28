import {
    Document, ImageRun, Paragraph, TextRun, Packer, AlignmentType,
    ExternalHyperlink, BorderStyle, Table,
    TableRow, TableCell, WidthType, VerticalAlign,
    TabStopPosition, TabStopType, Tab
} from '../libs/docx.js';

const ptToTwip = (pt) => pt * 20;
const lineHeight = 16
const padding = 5

function getPersonalInfo1(json, deliminator) {
    const data = [];
    if (json.location) data.push(json.location);
    if (json.email) data.push(json.email);
    if (json.phone) data.push(json.phone);
    return data.join(` ${deliminator} `);
}

function renderPersonalInfo2(json, deliminator) {
    const children = [];
    let github = json.github;
    let website = json.website;
    let linkedin = json.linkedin;
    let linkedin_placeholder = json.linkedin_placeholder;
    let github_placeholder = json.github_placeholder;
    let website_placeholder = json.website_placeholder;

    let arrayTemp = []
    let temp = ''
    let githubContent = github_placeholder ? github_placeholder : github;
    if (githubContent) {
        temp += githubContent
        if (github.includes("https://") || github.includes("www.")) {
            children.push(
                new ExternalHyperlink({
                    children: [
                        new TextRun({
                            text: githubContent,
                            style: "Hyperlink",
                        }),
                    ],
                    link: github,
                }),
            )
        } else {
            children.push(
                new TextRun(githubContent)
            )
        }
        arrayTemp.push(githubContent)
    }


    let websiteContent = website_placeholder ? website_placeholder : website;
    if (websiteContent) {
        if (temp)
            children.push(
                new TextRun(` ${deliminator} `)
            )
        temp += websiteContent
        if (website.includes("https://") || website.includes("www.")) {
            children.push(
                new ExternalHyperlink({
                    children: [
                        new TextRun({
                            text: websiteContent,
                            style: "Hyperlink",
                        }),
                    ],
                    link: website,
                }),
            )
        } else {
            children.push(
                new TextRun(websiteContent)
            )
        }
        arrayTemp.push(websiteContent)
    }

    let linkedinContent = linkedin_placeholder ? linkedin_placeholder : linkedin;
    if (linkedinContent) {
        if (temp)
            children.push(
                new TextRun(` ${deliminator} `)
            )
        temp += linkedinContent
        if (linkedin.includes("https://") || linkedin.includes("www.")) {
            children.push(
                new ExternalHyperlink({
                    children: [
                        new TextRun({
                            text: linkedinContent,
                            style: "Hyperlink",
                        }),
                    ],
                    link: linkedin,
                }),
            )
        } else {
            children.push(
                new TextRun(linkedinContent)
            )
        }
        arrayTemp.push(linkedinContent)
    }

    return {
        personalInfo2: children,
        personalInfo2String: arrayTemp.join(` ${deliminator} `)
    };
}


function jsonReader(json) {
    const deliminator = ' | '
    const children = []
    const name = json.name
    const img = json.profileImage;
    const imgType = json.profileImageType?.split('/')[1];
    const personalInfo = getPersonalInfo1(json, deliminator)
    const { personalInfo2, personalInfo2String } = renderPersonalInfo2(json, deliminator)

    function personalInfoArray() {
        const array = []

        // NAME
        array.push(
            new Paragraph({
                alignment: img ? AlignmentType.LEFT : AlignmentType.CENTER,
                children: [
                    new TextRun({
                        text: name || "Your Name",
                        bold: true,
                        size: 32,
                    }),
                ],
                spacing: {
                    line: ptToTwip(lineHeight + padding), // 16pt line height 
                    lineRule: "exact", // force exact height 
                },
            })
        );

        // PERSONAL INFO
        if (personalInfo)
            array.push(
                new Paragraph({
                    alignment: img ? AlignmentType.LEFT : AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: personalInfo,
                            size: 20,
                        }),
                    ],
                    spacing: {
                        line: ptToTwip(lineHeight + padding), // 16pt line height 
                        lineRule: "exact", // force exact height 
                    },
                })
            );

        // PERSONAL INFO 2
        if (personalInfo2String)
            array.push(
                new Paragraph({
                    alignment: img ? AlignmentType.LEFT : AlignmentType.CENTER,
                    children: [...personalInfo2],
                    spacing: {
                        line: ptToTwip(lineHeight + padding), // 16pt line height 
                        lineRule: "exact", // force exact height 
                    },
                })
            );

        return array
    }

    // personal info
    if (img) {
        children.push(
            new Table({
                width: {
                    size: 100,
                    type: WidthType.PERCENTAGE,
                },
                borders: {
                    top: { style: "none", size: 0, color: "FFFFFF" },
                    bottom: { style: "none", size: 0, color: "FFFFFF" },
                    left: { style: "none", size: 0, color: "FFFFFF" },
                    right: { style: "none", size: 0, color: "FFFFFF" },
                    insideHorizontal: { style: "none", size: 0, color: "FFFFFF" },
                    insideVertical: { style: "none", size: 0, color: "FFFFFF" },
                },
                rows: [
                    new TableRow({
                        children: [
                            // IMAGE COLUMN
                            new TableCell({
                                width: {
                                    size: 17,
                                    type: WidthType.PERCENTAGE,
                                },
                                verticalAlign: VerticalAlign.CENTER,
                                children: [
                                    new Paragraph({
                                        children: [
                                            new ImageRun({
                                                type: imgType,
                                                data: img,
                                                transformation: {
                                                    width: 100,
                                                    height: 100,
                                                },
                                            }),
                                        ],
                                    }),
                                ],
                            }),

                            // TEXT COLUMN
                            new TableCell({
                                width: {
                                    size: 83,
                                    type: WidthType.PERCENTAGE,
                                },
                                verticalAlign: VerticalAlign.BOTTOM,
                                children: [
                                    ...personalInfoArray()
                                ],
                            }),
                        ],
                    }),
                ],
            })
        );
    } else {
        // personal info
        children.push(...personalInfoArray())
    }

    const summary = json.summary
    if (summary) {

        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: "Summary",
                        bold: true,
                        size: 28, // adjust as needed
                    }),
                ],
                spacing: {
                    line: ptToTwip(lineHeight + padding), // 16pt line height 
                    lineRule: "exact", // force exact height 
                },
                border: {
                    bottom: {
                        color: "999999",
                        space: 4,
                        style: BorderStyle.SINGLE,
                        size: 6, // thickness (6 = thin, 12 = medium)
                    },
                },
            })
        );


        children.push(
            new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                children: [
                    new TextRun({
                        text: summary,
                        size: 20,
                    }),
                ],
                spacing: {
                    line: ptToTwip(lineHeight + padding), // 16pt line height 
                    lineRule: "exact", // force exact height 
                },
            })
        );
    }

    const skillsEntries = json.skills
    if (skillsEntries.length > 0) {
        const check = json.skills;
        if (check[0].skill || check[0].description) {
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Skills",
                            bold: true,
                            size: 28, // adjust as needed
                        }),
                    ],
                    spacing: {
                        line: ptToTwip(lineHeight + padding), // 16pt line height 
                        lineRule: "exact", // force exact height 
                    },
                    border: {
                        bottom: {
                            color: "999999",
                            space: 4,
                            style: BorderStyle.SINGLE,
                            size: 6, // thickness (6 = thin, 12 = medium)
                        },
                    },
                })
            );

            skillsEntries.forEach((entry, index) => {
                const skill = entry.skill;
                const description = entry.description;

                const renderedSkill = () => {
                    const array = []
                    if (skill) {
                        const temp = description.length ? `${skill}: ` : skill
                        array.push(new TextRun({ text: temp, bold: true }))
                    }
                    if (description)
                        array.push(new TextRun({ text: description }))
                    return array
                }

                children.push(
                    new Paragraph({
                        children: [
                            ...renderedSkill()
                        ],
                        spacing: {
                            line: ptToTwip(lineHeight + padding), // 16pt line height 
                            lineRule: "exact", // force exact height 
                        },
                    })
                )
            });
        }
    }

    const experienceEntries = json.experiences
    if (experienceEntries.length > 0) {
        const check = json.experiences;
        if (
            check[0].position ||
            check[0].company ||
            check[0].location ||
            check[0].dates ||
            check[0].bullets
        ) {
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Experience",
                            bold: true,
                            size: 28, // adjust as needed
                        }),
                    ],
                    spacing: {
                        line: ptToTwip(lineHeight + padding), // 16pt line height 
                        lineRule: "exact", // force exact height 
                    },
                    border: {
                        bottom: {
                            color: "999999",
                            space: 4,
                            style: BorderStyle.SINGLE,
                            size: 6, // thickness (6 = thin, 12 = medium)
                        },
                    },
                })
            );

            experienceEntries.forEach((entry, index) => {
                const position = entry.position;
                const company = entry.company;
                const location = entry.location;
                const dates = entry.dates;
                const bullets = entry.bullets.split("\n");

                const renderPos = (position, date) => {
                    const array = []
                    let isTab = false
                    if (position) {
                        array.push(new TextRun({ text: position, bold: true }))
                        if (date)
                            isTab = true
                    }
                    if (date) array.push(new TextRun({ text: `${isTab ? '\t' : ''}${date}` }))

                    return new Paragraph({
                        children: [
                            ...array
                        ],
                        tabStops: [
                            {
                                type: TabStopType.RIGHT,
                                position: TabStopPosition.MAX + 1660,
                            },
                        ],
                        spacing: {
                            line: ptToTwip(lineHeight + padding), // 16pt line height 
                            lineRule: "exact", // force exact height 
                        },
                    })
                }

                const renderComp = (company, location) => {
                    let text = ''
                    if (company) {
                        text += company
                        if (location)
                            text += ' - '
                    }
                    if (location)
                        text += location

                    return new Paragraph({
                        children: [
                            new TextRun({ text: text })
                        ],
                        spacing: {
                            line: ptToTwip(lineHeight + padding), // 16pt line height 
                            lineRule: "exact", // force exact height 
                        },
                    })
                }


                const renderExperience = () => {
                    const array = []
                    if (position || dates) array.push(renderPos(position, dates))
                    if (company || location) array.push(renderComp(company, location))
                    bullets.forEach(bullet => {
                        array.push(
                            new Paragraph({
                                text: bullet,
                                bullet: { level: 0 },
                                spacing: {
                                    line: ptToTwip(lineHeight + padding), // 16pt line height 
                                    lineRule: "exact", // force exact height 
                                },
                            })
                        )
                    })
                    return array
                }

                children.push(
                    ...renderExperience()
                )

            })
        }
    }

    const projectsEntries = json.projects
    if (projectsEntries.length > 0) {
        const check = json.projects;
        if (check[0].projectName || check[0].projectLink || check[0].bullets) {
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Projects",
                            bold: true,
                            size: 28, // adjust as needed
                        }),
                    ],
                    spacing: {
                        line: ptToTwip(lineHeight + padding), // 16pt line height 
                        lineRule: "exact", // force exact height 
                    },
                    border: {
                        bottom: {
                            color: "999999",
                            space: 4,
                            style: BorderStyle.SINGLE,
                            size: 6, // thickness (6 = thin, 12 = medium)
                        },
                    },
                })
            );

            projectsEntries.forEach((entry, index) => {
                const projectName = entry.projectName;
                const projectLink = entry.projectLink;
                const bullets = entry.bullets.split("\n");

                const renderProjectLink = (projectLink) => {
                    if (projectLink.includes("https://") || projectLink.includes("www.")) {
                        return new ExternalHyperlink({
                            children: [
                                new TextRun({
                                    text: projectLink,
                                    style: "Hyperlink",
                                }),
                            ],
                            link: projectLink,
                        })
                    } else {
                        return new TextRun({ text: projectLink })
                    }
                }

                const rendreProjects = () => {
                    const array = []

                    if (projectName)
                        array.push(
                            new Paragraph({
                                children: [
                                    new TextRun({ text: projectName, bold: true })
                                ],
                                spacing: {
                                    line: ptToTwip(lineHeight + padding), // 16pt line height 
                                    lineRule: "exact", // force exact height 
                                },
                            }))

                    if (projectLink)
                        array.push(
                            new Paragraph({
                                children: [
                                    renderProjectLink(projectLink)
                                ],
                                spacing: {
                                    line: ptToTwip(lineHeight + padding), // 16pt line height 
                                    lineRule: "exact", // force exact height 
                                },
                            }))

                    bullets.forEach(bullet => {
                        array.push(
                            new Paragraph({
                                text: bullet,
                                bullet: { level: 0 },
                                spacing: {
                                    line: ptToTwip(lineHeight + padding), // 16pt line height 
                                    lineRule: "exact", // force exact height 
                                },
                            })
                        )
                    })

                    return array
                }
                children.push(
                    ...rendreProjects()
                )
            })
        }
    }

    const educationEntries = json.educations
    if (educationEntries.length > 0) {
        const check = json.educations;
        if (
            check[0].university ||
            check[0].degree ||
            check[0].gpa ||
            check[0].graduationDate
        ) {
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Education",
                            bold: true,
                            size: 28, // adjust as needed
                        }),
                    ],
                    spacing: {
                        line: ptToTwip(lineHeight + padding), // 16pt line height 
                        lineRule: "exact", // force exact height 
                    },
                    border: {
                        bottom: {
                            color: "999999",
                            space: 4,
                            style: BorderStyle.SINGLE,
                            size: 6, // thickness (6 = thin, 12 = medium)
                        },
                    },
                })
            );

            educationEntries.forEach((entry, index) => {
                const university = entry.university;
                const degree = entry.degree;
                const gpa = entry.gpa;
                const graduationDate = entry.graduationDate;

                const renderSchool = (school, date) => {
                    const array = []
                    let isTab = false
                    if (school) {
                        array.push(new TextRun({ text: school, bold: true }))
                        if (date)
                            isTab = true
                    }
                    if (date) array.push(new TextRun({ text: `${isTab ? '\t' : ''}${date}` }))

                    return new Paragraph({
                        children: [
                            ...array
                        ],
                        tabStops: [
                            {
                                type: TabStopType.RIGHT,
                                position: TabStopPosition.MAX + 1660,
                            },
                        ],
                        spacing: {
                            line: ptToTwip(lineHeight + padding), // 16pt line height 
                            lineRule: "exact", // force exact height 
                        },
                    })
                }

                const renderDegree = (degree, gpa) => {
                    let text = ''
                    if (degree) {
                        text += degree
                        if (gpa)
                            text += ' - '
                    }
                    if (gpa)
                        text += gpa

                    return new Paragraph({
                        children: [
                            new TextRun({ text: text })
                        ],
                        spacing: {
                            line: ptToTwip(lineHeight + padding), // 16pt line height 
                            lineRule: "exact", // force exact height 
                        },
                    })
                }

                const renderEducation = () => {
                    const array = []
                    if (university || degree) array.push(renderSchool(university, graduationDate))
                    if (gpa || graduationDate) array.push(renderDegree(degree, gpa))
                    return array
                }

                children.push(
                    ...renderEducation()
                )
            })
        }
    }

    const certificateEntries = json.certificates;
    if (certificateEntries.length > 0) {
        const check = json.certificates;
        if (
            check[0].certName ||
            check[0]["issuer/description"]
        ) {
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Certificates",
                            bold: true,
                            size: 28, // adjust as needed
                        }),
                    ],
                    spacing: {
                        line: ptToTwip(lineHeight + padding), // 16pt line height 
                        lineRule: "exact", // force exact height 
                    },
                    border: {
                        bottom: {
                            color: "999999",
                            space: 4,
                            style: BorderStyle.SINGLE,
                            size: 6, // thickness (6 = thin, 12 = medium)
                        },
                    },
                })
            );

            certificateEntries.forEach((entry, index) => {
                const certName = entry.certName;
                const issuer = entry["issuer/description"];
                const certDate = entry.certDate;

                const renderCert = (certName, date) => {
                    const array = []
                    let isTab = false
                    if (certName) {
                        array.push(new TextRun({ text: certName, bold: true }))
                        if (date)
                            isTab = true
                    }
                    if (date) array.push(new TextRun({ text: `${isTab ? '\t' : ''}${date}` }))

                    return new Paragraph({
                        children: [
                            ...array
                        ],
                        tabStops: [
                            {
                                type: TabStopType.RIGHT,
                                position: TabStopPosition.MAX + 1660,
                            },
                        ],
                        spacing: {
                            line: ptToTwip(lineHeight + padding), // 16pt line height 
                            lineRule: "exact", // force exact height 
                        },
                    })
                }

                const renderCertificate = () => {
                    const array = []
                    if (certName) array.push(renderCert(certName, certDate))
                    if (issuer) array.push(new Paragraph({
                        text: issuer,
                        spacing: {
                            line: ptToTwip(lineHeight + padding), // 16pt line height 
                            lineRule: "exact", // force exact height 
                        },
                    }))
                    return array
                }

                children.push(
                    ...renderCertificate()
                )
            })
        }
    }

    return children
}

export function generateDocx(json, save = false) {
    const children = jsonReader(json)
    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 300,      // 40pt
                        right: 600,    // 30pt
                        bottom: 300,   // 30pt
                        left: 800,     // 40pt
                    },
                }
            },
            children: [
                ...children
            ],
        }]
    });

    if (save)
        Packer.toBlob(doc).then(blob => {
            const saveName = prompt("Enter a name for your save file");
            // console.log(blob);
            saveAs(blob, `${saveName ? saveName : "resume"}.docx`);
            // console.log("Document created successfully");
        });
}