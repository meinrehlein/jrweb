---
name: text 4
online: false
title: "{{name}}"
category: B
kind: text
startTime: 0
order_about: 0
order_projects: 0
order_video: 0
---
\# .pages.yml — Pages CMS configuration

media:

input: public/images/uploads

output: /images/uploads

content:

\- name: projects

label: Projects

type: collection

path: src/data/projects

format: yaml-frontmatter

filename: "{slug}.md" # slug will become filename

slug: "{{name}}" # slug is generated from the "name" field

view:

fields: \[name, title, category, kind, year\]

sort: \[year, name\]

default:

sort: year

order: desc

fields:

\- name: name

label: Name

type: string

required: true

\- name: title

label: Title

type: string

required: false

default: "{{name}}"

\# Images: repeatable object { src, alt }

\- name: images

label: Images

type: object

list: true

fields:

\- name: src

label: Image

type: image

\- name: alt

label: Alt Text

type: string

\- name: category

label: Category

type: select

options:

values: \[A, B, C\]

default: B

\- name: kind

label: Kind

type: select

options:

values: \[image, text, video\]

default: image

\- name: video

label: Video URL

type: string

required: false

\- name: startTime

label: Video Starttime

type: number

required: false

default: 0

\- name: order\_about

label: Order About

type: number

required: false

default: 0

\- name: order\_projects

label: Order Projects

type: number

required: false

default: 0

\- name: order\_video

label: Order Video

type: number

required: false

default: 0

\- name: body

label: Body (DE)

type: rich-text

required: false

\- name: body\_en

label: Body (EN)

type: rich-text

required: false