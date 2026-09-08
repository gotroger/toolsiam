# ผลการ Refactor Frontend ToolSiam — 9 กันยายน 2569

ปรับหน้าเว็บจริงบน Astro 7, React 19, Tailwind 4 และ Fuse.js เดิม โดยไม่เพิ่ม dependency หรือแก้ backend/API/สูตรคำนวณ

## สิ่งที่เปลี่ยน

หน้าแรกใช้ช่องค้นหาหลัก พร้อม quick links, category pills, bento เครื่องมือแนะนำ และทางลัด PromptPay โดยเก็บผลหวยจริงและข้อความกำกับความเชื่อไว้ครบ

ToolCard เปลี่ยนจากภาพปก 16:9 เป็นไอคอน SVG มีมิติ ชื่อสั้น คำอธิบายสั้น และลูกศรเปิดเครื่องมือ ซึ่งใช้ร่วมกันในหน้าแรก หน้าค้นหา หมวดหมู่ และเครื่องมือที่เกี่ยวข้อง

ToolShell วาง UI เครื่องมือด้านบนในกรอบแอป แล้วแสดงคำอธิบายเต็ม แหล่งอ้างอิง ตัวอย่าง วิธีใช้ และ FAQ ด้านล่าง โดยรักษาชื่อ H1 เดิม

Search รองรับชื่อไทย/อังกฤษ คำค้นและหมวดหมู่ พร้อมผลลัพธ์ทันที ล้างคำค้น คืนโฟกัส Escape, ArrowDown, Cmd/Ctrl+K และจำ query/category ใน URL

ชุด field, button, ResultBox และ loading ใช้ผิวและรูปทรงเดียวกัน พร้อม textarea ที่ขยายตามข้อความและการหดตัวของ grid ที่ป้องกันช่องกรอกถูกตัดบนมือถือ

พื้นที่กว้างสุด 1360px และหน้าเครื่องมือ 1080px โดย bento เปลี่ยนรูปแบบตามจอและหมวดหมู่หน้าแรกบนมือถือเป็นสองแถวที่เลื่อนได้ด้วยคีย์บอร์ด

Motion ใช้ CSS 150–300ms พร้อม reduced motion และไม่มี WebGL, video background หรือ animation dependency

## Component ที่สร้างใหม่

| Component / ไฟล์       | หน้าที่                                            |
| ---------------------- | -------------------------------------------------- |
| `CategoryPill.tsx`     | ลิงก์หมวดหมู่และปุ่มกรองที่แสดงสถานะเลือก          |
| `SectionHeader.astro`  | หัวข้อ section และลิงก์ไปหน้ารวม                   |
| `ToolIcon.tsx`         | SVG จากชุดหมวดเดิมและไอคอนเฉพาะเครื่องมือ          |
| `ui/search-field.tsx`  | Search input, clear และ submit ที่ใช้ร่วมกัน       |
| `tool-presentation.ts` | ข้อความสั้นสำหรับ discovery โดยแยกจาก SEO metadata |
| `styles/product.css`   | Product tokens, surfaces, responsive และ motion    |

Refactor `Header`, `Base`, `ToolCard`, `ToolSearch`, `ToolShell`, `Card`, `ToolIsland` และ primitive ใน `components/ui` พร้อมบันทึกแนวทางใน `DESIGN.md` และ `UX-CONTRACT.md`

## ผลตรวจ

| การตรวจ                      | ผล                                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| ESLint                       | ผ่าน                                                                                   |
| Typecheck: astro sync + tsc  | ผ่าน                                                                                   |
| Vitest                       | 68 ไฟล์ / 681 tests ผ่าน                                                               |
| Production build             | ผ่าน / 115 HTML routes                                                                 |
| Prettier เฉพาะไฟล์ที่แก้     | ผ่าน                                                                                   |
| git diff --check             | ผ่าน                                                                                   |
| Size budget                  | ผ่านหลังปรับเฉพาะ CSS และ content HTML พร้อมบันทึกเหตุผล                               |
| DESIGN.md lint               | 0 errors; 9 คำเตือนเรื่อง token ที่ไม่ได้อ้างผ่าน component frontmatter                |
| SEO เทียบ build จาก git HEAD | 115 routes เหมือนเดิม; title, description, canonical, robots และ JSON-LD ไม่มีความต่าง |
| sitemap / robots.txt         | เหมือนเดิมทุก byte                                                                     |
| Browser accessibility        | axe WCAG A/AA บน 115 หน้า × light/dark = 230 states ไม่พบ violation หลังแก้ไข          |
| Responsive                   | 12 หน้าตัวแทน × 1280/768/390px × light/dark พร้อมภาพหน้าจอ                             |
| จอแคบเพิ่มเติม               | 34 หน้าเครื่องมือที่ 320px ไม่มีช่องกรอกล้นกรอบที่ตรวจ                                 |
| Browser interaction          | ค้นหา, empty, clear, keyboard, mobile menu, URL/back, เงินเดือน, QR และค้นฝัน ผ่าน     |

ตรวจภาพทุก route ผ่าน contact sheets และดูภาพขนาดจริงของ Home, catalog, category, tool form, QR และ mobile เพื่อแก้ layout ที่การตรวจ build ไม่พบ

ข้อผิดพลาดที่แก้จาก QA ได้แก่ aria-controls ที่อ้างผลลัพธ์ซึ่งยังไม่เปิด, contrast ของตัวนับหมวด/QR placeholder/วันหยุด, กรอบ QR บนมือถือ, grid ฟอร์มภาษีที่ถูกตัดด้านขวา และ animation entrance ที่ค้าง transform จน hover ไม่ยกการ์ด

Skill static auditor คืน 15 flags ที่ตรวจแล้วเป็น false positive: test fixtures 3 รายการ, shared Button ที่ส่ง onClick ผ่าน props 1 รายการ, generic `useState<Form>` ที่ถูกอ่านเป็น HTML 1 รายการ และการเรียก shared Textarea 10 รายการที่ parser ไม่ตามไปดู resize-none/auto-grow จึงไม่ได้อ้างว่า raw auditor ผ่าน

## Performance

| รายการ gzip      |     ก่อน |     หลัง |
| ---------------- | -------: | -------: |
| CSS รวม          |   8.7 KB |  11.8 KB |
| Tool JS p95      | 105.1 KB | 106.0 KB |
| Tool HTML p95    |  11.8 KB |  11.8 KB |
| Content HTML p95 |   8.8 KB |  12.8 KB |
| JS `/tools`      | 107.9 KB |  77.5 KB |
| JS `/`           |  63.4 KB |  81.3 KB |

หน้าค้นหาโหลดเฉพาะข้อมูล discovery แทน registry ที่มี FAQ และแหล่งอ้างอิงทั้งชุด จึงลด JS หน้ารวมประมาณ 28% ส่วนหน้าแรกเพิ่ม search island และ HTML ที่ฝังดัชนีค้นหาเพื่อเปิดใช้ได้ทันที

CSS เพิ่มประมาณ 3 KB gzip จาก design system และ responsive layout ซึ่งบันทึกการปรับ budget ไว้ใน `docs/perf-budget.md` โดยคงเพดาน JS และ tool HTML เดิม

วัด PerformanceObserver บน Chromium ที่ 390px ในเครื่องพัฒนา 5 หน้าพบ LCP 40–344ms และ CLS 0 โดยไม่มี CPU/network throttling และวัดเพียงหนึ่งครั้งต่อหน้า จึงใช้เป็น smoke test เท่านั้น

## หลักฐานใน workspace

ภาพและ log อยู่ใน `output/playwright/` ซึ่งถูกกันออกจาก git, ESLint และ Prettier เพราะเป็นผลการทดสอบที่สร้างในเครื่อง

- `seo-comparison.json`: ผลเปรียบเทียบ SEO กับ build เดิม
- `qa-batch-0.log` ถึง `qa-batch-4.log`: accessibility/heading/overflow ครบทุกหน้า
- `all-pages/`: ภาพ light/dark ครบ 115 routes
- `responsive/`: ภาพ full page ของหน้าแทนแต่ละ layout
- `interactions.log`: ผลใช้งานจริง 15 เงื่อนไข
- `motion-recovery.log`: hover/reduced motion, native controls และการกู้คืนเมื่อ tool chunk โหลดล้มเหลว
- `tests.log`, `build.log`, `size-check.log`, `format-check.log`: ผลตรวจโปรเจกต์
- `premium-audit.json` และ `premium-audit-reviewed.json`: raw static flags และคำอธิบายแต่ละรายการ

## จุดที่ควรติดตามต่อ

Core Web Vitals ภาคสนามและ Safari/iOS/Android เครื่องจริงยังต้องวัดหลังนำขึ้นใช้งาน เพราะรอบนี้ทดสอบด้วย Chromium บนเครื่องพัฒนาและจำลองขนาด viewport

การแสดงคำว่า “ยอดนิยม” ควรรอข้อมูลการใช้งานจริง โดยรอบนี้ยังใช้ “เครื่องมือแนะนำ” ตาม featuredRank ที่ทีมจัดไว้

## ไฟล์ที่แก้และสร้าง

- `.gitignore`
- `.prettierignore`
- `DESIGN.md`
- `UX-CONTRACT.md`
- `docs/perf-budget.md`
- `eslint.config.mjs`
- `premium-ui.json`
- `src/components/Card.astro`
- `src/components/CategoryPill.tsx`
- `src/components/DesignSystemDemo.tsx`
- `src/components/Header.astro`
- `src/components/SectionHeader.astro`
- `src/components/ToolCard.astro`
- `src/components/ToolCard.tsx`
- `src/components/ToolIcon.tsx`
- `src/components/ToolSearch.test.tsx`
- `src/components/ToolSearch.tsx`
- `src/components/ToolShell.astro`
- `src/components/tool-presentation.ts`
- `src/components/ui/button.tsx`
- `src/components/ui/feedback.tsx`
- `src/components/ui/form.tsx`
- `src/components/ui/list.tsx`
- `src/components/ui/search-field.tsx`
- `src/components/ui/styles.ts`
- `src/layouts/Base.astro`
- `src/pages/categories/[category].astro`
- `src/pages/index.astro`
- `src/pages/tools/index.astro`
- `src/styles/global.css`
- `src/styles/product.css`
- `src/tools/ToolIsland.tsx`
- `src/tools/date/thai-holidays/Tool.tsx`
- `src/tools/finance/vat-wht/Tool.tsx`
- `src/tools/qr/promptpay-qr/Tool.tsx`
- `src/tools/text/baht-text/Tool.tsx`
- `src/tools/text/text-lines/Tool.tsx`
- `src/tools/text/thai-id-check/Tool.tsx`
- `src/tools/text/thai-numerals/Tool.tsx`
- `src/tools/text/word-count/Tool.tsx`

- `docs/frontend-refactor-2026-09-09.md`
