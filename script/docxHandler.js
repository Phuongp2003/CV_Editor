import {
    Document, ImageRun, Paragraph, TextRun, Packer, AlignmentType,
    ExternalHyperlink, TextWrappingType, Table,
    TableRow, TableCell, WidthType, VerticalAlign,
} from '../libs/docx.js';

const ptToTwip = (pt) => pt * 20;
const lineHeight = 16
const padding = 7

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
                                verticalAlign: VerticalAlign.CENTER,
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


    return children
}

export function generateDocx(json, save = false) {
    const children = jsonReader(json)
    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 800,      // 40pt
                        right: 600,    // 30pt
                        bottom: 600,   // 30pt
                        left: 800,     // 40pt
                    },
                }
            },
            children: [
                ...children
            ],
        }]
    });

    Packer.toBlob(doc).then(blob => {
        // console.log(blob);
        saveAs(blob, "example.docx");
        console.log("Document created successfully");
    });
}