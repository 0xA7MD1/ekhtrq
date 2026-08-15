# خطط عمليات إضافية (مسودّات تصميم — غير منشورة)

هذا الملف **خطة فقط**. لا شيء هنا يظهر في الواجهة: المُحمِّل
(`src/lib/labs/registry.ts`) يكتشف أي ملف `.json` داخل `src/cases/` ويعطيه
مسارًا تلقائيًا، فما دامت هذه القضايا تعيش كـ Markdown في `docs/` فهي غير قابلة
للّعب. حوّل أيًّا منها إلى `src/cases/NN-slug.json` فقط حين تقرّر نشرها.

كل خطة مكتوبة على عقد المانيفست في
[`src/lib/labs/schema.ts`](../src/lib/labs/schema.ts)، وتلتزم بقواعد
[`src/cases/README.md`](../src/cases/README.md): الأعلام هي الحالة الوحيدة، والدليل
هو المكان الوحيد الذي يكشف الخطوة التالية، والإدخال خارج المسار يُرجِع فشلًا
واقعيًا لا يُسرّب تلميحًا.

## القوس السردي

تُكمِل هذه العمليات خيط «الساعي» الذي فتحته
[`01-the-name`](../src/cases/01-the-name.json) وتابعته مسودّة
[`02-the-market`](../src/cases/_drafts/02-the-market.json): بعد أن أعدتَ بيانات
ضحايا Matrix، عادت للبيع في سوق «الفهرس» الذي يديره الساعي. العمليات الخمس تفكّك
هذا السوق طبقةً طبقةً حتى الوصول إلى الساعي نفسه.

```
02 الفهرس (دفتر البائعين)
       │
       ├── 03 الوسيط   (سهل)    ── بائع صغير مهمل يكشف عنوان بوّابة السوق
       ├── 04 القائمة  (سهل)    ── صندوق تسليم بكلمة مرور ضعيفة، فيه قائمة المشترين
       ├── 05 الواجهة  (متوسط)  ── حقن SQL في واجهة المتجر يفرّغ حسابات الإدارة
       ├── 06 الخزنة   (متوسط)  ── محفظة الدفع المشفّرة، تُكسر وتُنقل بأمان
       └── 07 الساعي   (صعب)    ── خادم الدفع المركزي: تجميع الخيوط وكشف الساعي
```

## توزيع الصعوبة (كما طُلب)

| # | العنوان | الصعوبة | المهارة المحورية الجديدة | الوقت |
| - | ------- | ------- | ----------------------- | ----- |
| 03 | الوسيط | سهل | تعداد `ffuf` + قراءة نسخة احتياطية مكشوفة | ~15د |
| 04 | القائمة | سهل | تخمين كلمة مرور SSH بـ `hydra` | ~18د |
| 05 | الواجهة | متوسط | حقن SQL آليًا بـ `sqlmap` | ~35د |
| 06 | الخزنة | متوسط | كسر GPU بـ `hashcat` + سحب `scp` + تحوّل `su` | ~40د |
| 07 | الساعي | صعب | محور متعدّد الخوادم + مُستمِع `nc` + سلسلة تصعيد | ~65د |

**لا حاجة لأي إدخال جديد في `_shared/toolbox.json`** — كل الأدوات المستعملة
(`ffuf`, `hydra`, `sqlmap`, `hashcat`, `scp`, `nc`, `nikto`, `dig`, `find`,
`sudo`, `su`) موثّقة أصلًا هناك.

---

# 03 — «الوسيط»  ·  سهل

```jsonc
"id": "03-the-broker",
"title": "الوسيط",
"difficulty": "easy",
"isFree": true,          // ثانية مجانية لتعليم التعداد بلا كسر تجزئة
"estimatedMinutes": 15,
"tagline": "بائع صغير نسى نسخته الاحتياطية في العلن. من خلفها يبدأ الطريق إلى السوق.",
"skills": ["تعداد ويب", "أسرار مكشوفة", "قراءة نسخة احتياطية"]
```

**الفكرة التعليمية:** أبسط سلسلة ممكنة — تعداد مسار مخفي ثم قراءة ملف تُرك في
العلن. لا SSH ولا تصعيد. تُعلّم أن أخطر ثغرة أحيانًا مجرّد ملف منسيّ.

### الدخول (intro)
- `type: "message"` — رسالة من فريق الاستجابة.
- الجوهر: «الفهرس لا يبيع مباشرة، بل عبر وسطاء صغار. أحدهم — متجر `souq-rakhis.io` —
  يعرض واجهة عادية، لكن من يبني بسرعة ينسى ملفًا خلفه. اعثر على ما نسيه، ففيه
  عنوان بوّابة السوق الحقيقية.»
- `mission`: استخرج من خادم الوسيط عنوان بوّابة «الفهرس».

### المضيفون
- مضيف واحد فقط: `local` (نفس بيئة `ekhtrq`). لا خادم بعيد — كل العمل من المتصفح
  والطرفية المحلية. هذا ما يبقيها سهلة.
- ملف انطلاق: `/home/guest/brief.txt` يذكر الهدف والأدوات ويكرّر
  «اكتب `help`» و«`man <أداة>`».
- قائمة كلمات: `/home/guest/wordlists/common.txt` تحوي `.git`, `backup`,
  `backups`, `config`, `.env`, `uploads`.

### الأدوات
`["gobuster", "ffuf", "wget", "curl", "nmap"]`

### مخطّط الأعلام
```
(browser) souq-rakhis.io          ─► يقرأ الصفحة، لا شيء ظاهر
(ffuf/gobuster) FUZZ=/backup      ─► dir_found
(browser|wget) /backup/store.sql.bak (requires dir_found) ─► backup_found
(cat store.sql.bak) يكشف السطر:
   gateway_url = https://gate.alfahras.io   ─► gateway_revealed  ← الإكمال
```

### قواعد الطرفية (أهمها)
| id | host | match (تقريبي) | requires | unlocks |
| -- | ---- | -------------- | -------- | ------- |
| `ffuf-scan` | local | `^ffuf\s+.*souq-rakhis\.io/FUZZ` | — | `dir_found` |
| `gobuster-scan` | local | `^gobuster\s+dir\s+.*souq-rakhis\.io` | — | `dir_found` (طريق بديل) |
| `wget-backup` | local | `^wget\s+.*souq-rakhis\.io/backup/store\.sql\.bak` | `dir_found` | `backup_found` |
| `curl-backup` | local | `^curl\s+.*/backup/store\.sql\.bak` | `dir_found` | `backup_found` |

- `ffuf` يطبع نتيجة تعداد فيها `backup [Status: 200]`؛ `gobuster` يطبع نفس المسار
  بصيغة `Index of` — الطريقان متكافئان (README §«اعثر على باب الدخول» يفعل هذا).
- التنزيل يكتب `/home/guest/store.sql.bak` في نظام الملفات المحلي، محتواه سطور
  SQL عادية بينها `-- gateway_url = https://gate.alfahras.io`، ثم `cat` عليه
  يمنح `gateway_revealed` (العلم على ملف عبر `unlocks` في `filesystem`، أو على
  التنزيل عبر `downloads[].unlocks`).

### المتصفح
- `search["souq rakhis"]` و`search["الفهرس"]` → بطاقة واحدة لموقع الوسيط.
- `sites["http://souq-rakhis.io"]`: صفحة متجر واجهة، وتعليق HTML مموّه
  `<!-- TODO: احذف /backup قبل الإطلاق -->` (تلميح داخل السرد لا داخل المحرّك،
  مسموح لأنه محتوى مؤلَّف لا فشل أمر).
- `sites[".../backup"]` (requires `dir_found`): فهرس دليل فيه رابط
  `store.sql.bak` كـ `downloads[]` يمنح `backup_found`.

### الأهداف
```jsonc
{ "id": "recon",   "title": "اعثر على المسار المنسيّ",        "done": "dir_found" }
{ "id": "grab",    "title": "نزّل النسخة الاحتياطية",         "done": "backup_found" }
{ "id": "reveal",  "title": "استخرج عنوان بوّابة السوق",       "done": "gateway_revealed" }
```

### الدليل (ثلاث طبقات لكل هدف)
- **recon** — nudge: «الواجهة نظيفة، لكن ماذا خلفها؟» / hint: عدّد بالمسارات الشائعة
  + `ffuf -u http://souq-rakhis.io/FUZZ -w wordlists/common.txt` / solution: نفسه
  مع بديل `gobuster` / concept: التعداد يرسم سطح الهجوم؛ الأسماء الشائعة تُختبر
  آليًا.
- **grab** — hint: `/backup` مفتوح، نزّل `store.sql.bak` بزر التنزيل أو `wget` /
  concept: النسخ الاحتياطية تُنسى بلا حماية وتكشف أكثر من الموقع الحيّ.
- **reveal** — hint: `cat store.sql.bak` واقرأ سطر `gateway_url` / concept: سرّ في
  ملف = سرّ مكشوف؛ لا تشفير يحمي ما تُرك بنصّ صريح.

### الإكمال
- `trigger: "gateway_revealed"`.
- `message`: «عنوان البوّابة بيدك: `gate.alfahras.io`. من هنا يبدأ السوق فعلًا.»
- `teaser`: يمهّد للقضية 04 — «البوّابة تطلب دعوة. والدعوات تُوزَّع من صندوق تسليم
  محميّ بكلمة مرور… ضعيفة.»

---

# 04 — «القائمة»  ·  سهل

```jsonc
"id": "04-the-list",
"title": "القائمة",
"difficulty": "easy",
"isFree": false,
"estimatedMinutes": 18,
"tagline": "صندوق تسليم بكلمة مرور من قاموس. خلفه قائمة كل من اشترى.",
"skills": ["فحص منافذ", "تخمين كلمة مرور", "دخول SSH"]
```

**الفكرة التعليمية:** تعريف `hydra` — كسر مصادقة حيّة بقائمة كلمات، مقابل كسر
تجزئة غير متصل (`john`) في القضية 01. سلسلة قصيرة: افحص → خمّن → ادخل → اقرأ.

### الدخول
- `type: "message"`: «صندوق التسليم `drop.alfahras.io` يوزّع دعوات السوق. مستخدمه
  `courier` وكلمة مروره من القاموس — لم يبدّلوها قط. بداخله قائمة المشترين.»
- `mission`: ادخل صندوق التسليم واستخرج قائمة المشترين.

### المضيفون
- `local` (ekhtrq) + `drop` (بعد `ssh_ok`).
- `local` فيها `/home/guest/wordlists/rockyou-lite.txt` (قائمة صغيرة تنتهي بـ
  `courier2024` — كلمة المرور المقصودة).
- `drop`: user `courier`، فيها:
  - `/home/courier/buyers.csv` — قائمة المشترين (الغنيمة).
  - `/home/courier/readme.txt` — «القائمة تُصدَّر أسبوعيًا إلى /root؛ courier لا
    يملك sudo.» (يقفل الباب على تصعيد غير مقصود ويبقيها سهلة).

### الأدوات
`["nmap", "hydra", "ssh"]`

### مخطّط الأعلام
```
(nmap) drop.alfahras.io          ─► port_scan_done  (يظهر 22/ssh مفتوحًا)
(hydra -l courier -P …)          ─► creds_found   (requires port_scan_done)
(ssh courier@drop … + password)  ─► ssh_ok        (switchHost: drop)
(cat /home/courier/buyers.csv)   ─► list_obtained ← الإكمال
```

### قواعد الطرفية
| id | host | match | requires | فعل |
| -- | ---- | ----- | -------- | --- |
| `nmap-drop` | local | `^nmap\s+.*drop\.alfahras\.io` | — | unlocks `port_scan_done` (منفذ 22) |
| `hydra-ssh` | local | `^hydra\s+-l\s+courier\s+-P\s+\S+\s+.*drop\.alfahras\.io\s+ssh` | `port_scan_done` | stream «\[22]\[ssh] host: … login: courier password: courier2024» → unlocks `creds_found` |
| `ssh-drop` | local | `^ssh\s+courier@drop\.alfahras\.io` | `creds_found` | prompt كلمة المرور، `expectInput: "courier2024"`, onSuccess `setState: ssh_ok`, `switchHost: drop` |

- `lockedOutput` لـ `hydra` قبل الفحص: فشل اتصال واقعي (`could not connect to
  target`) لا يُسرّب أن المنفذ موجود.
- الغنيمة: `cat /home/courier/buyers.csv` — العلم `list_obtained` عبر
  `filesystem["…buyers.csv"].unlocks`.

### الأهداف
```jsonc
{ "id": "scan",    "title": "افحص صندوق التسليم",     "done": "port_scan_done" }
{ "id": "guess",   "title": "خمّن كلمة مرور courier",  "done": "creds_found" }
{ "id": "enter",   "title": "ادخل عبر SSH",           "done": "ssh_ok" }
{ "id": "list",    "title": "استخرج قائمة المشترين",   "done": "list_obtained" }
```

### الدليل
- **scan** — hint: `nmap drop.alfahras.io` / concept: الفحص يحدّد ما يستمع قبل أي
  محاولة دخول.
- **guess** — hint: `hydra -l courier -P wordlists/rockyou-lite.txt drop.alfahras.io ssh`
  / concept: `hydra` يخمّن على الخدمة الحيّة (online) — لا يحتاج تجزئة، بل خدمة
  تقبل محاولات متكرّرة بلا حدّ. الفرق عن `john`: هذا ضدّ نظام يردّ، وذاك ضدّ ملف
  ساكن.
- **enter** — solution: `ssh courier@drop.alfahras.io` ثم `courier2024` /
  concept: كلمة مرور ضعيفة + خدمة بلا تحديد محاولات = باب مفتوح.
- **list** — hint: `cat /home/courier/buyers.csv` / concept: بعد الدخول، الغنيمة
  ملف عادي بصلاحيات المستخدم — لا حاجة لتصعيد إن كان المستخدم يملك القراءة.

### الإكمال
- `trigger: "list_obtained"`. `message`: قائمة المشترين بيدك.
- `teaser`: «كل مشترٍ يدفع عبر واجهة المتجر. والواجهة تسأل قاعدة بيانات… لا تنظّف
  مدخلاتها.» → يمهّد لـ 05.

---

# 05 — «الواجهة»  ·  متوسط

```jsonc
"id": "05-the-storefront",
"title": "الواجهة",
"difficulty": "medium",
"isFree": false,
"estimatedMinutes": 35,
"tagline": "حقل بحث واحد لا ينظّف مدخلاته. منه تسقط كل حسابات الإدارة.",
"skills": ["كشف ثغرات ويب", "حقن SQL", "استخراج بيانات اعتماد", "دخول SSH"]
```

**الفكرة التعليمية:** تعريف `sqlmap` وحقن SQL — أول قضية «استغلال ويب». السلسلة:
افحص بـ `nikto` → اكتشف معامل قابل للحقن → فرّغ جدول المستخدمين بـ `sqlmap` →
سجّل دخول SSH بحساب الإدارة.

### الدخول
- `type: "article"`: «واجهة `gate.alfahras.io` تبدو محصّنة، لكن حقل البحث فيها
  يبني استعلام SQL من مدخل المستخدم مباشرة. من يثق بمدخلات زوّاره يسلّمهم قاعدته.»
- `mission`: افرّغ جدول حسابات الإدارة من قاعدة الواجهة، وادخل الخادم بأحدها.

### المضيفون
- `local` + `gateway` (user `www-data`، بعد `ssh_ok`).
- `gateway` filesystem:
  - `/var/www/gate/config.php` — يكشف بيانات اتصال قاعدة داخلية (تمهيد لـ 06).
  - `/home/svc/notes.md` — يذكر أن المحفظة المشفّرة على خادم الدفع `pay`
    (تمهيد لـ 06/07).

### الأدوات
`["nmap", "nikto", "sqlmap", "ssh", "curl"]`

### مخطّط الأعلام
```
(nmap) gate.alfahras.io                     ─► port_scan_done (80/443)
(nikto -h) يكشف /search?q= معاملًا مشبوهًا   ─► inj_point_found
(sqlmap -u ".../search?q=1")                 ─► sqli_confirmed  (requires inj_point_found)
(sqlmap … --dump -T admins)                  ─► creds_dumped    (requires sqli_confirmed)
(ssh siteadmin@gate… + password من الـdump)  ─► ssh_ok
(cat /var/www/gate/config.php)               ─► pay_lead        ← الإكمال
```

### قواعد الطرفية
| id | host | match | requires | فعل |
| -- | ---- | ----- | -------- | --- |
| `nmap-gate` | local | `^nmap\s+.*gate\.alfahras\.io` | — | unlocks `port_scan_done` |
| `nikto-gate` | local | `^nikto\s+-h\s+.*gate\.alfahras\.io` | `port_scan_done` | يطبع `+ /search?q= : parameter may be injectable` → unlocks `inj_point_found` |
| `sqlmap-probe` | local | `^sqlmap\s+-u\s+["']?https?://gate\.alfahras\.io/search\?q=` | `inj_point_found` | يطبع تأكيد `parameter 'q' is vulnerable … MySQL` → unlocks `sqli_confirmed` |
| `sqlmap-dump` | local | `^sqlmap\s+.*--dump.*(-T\s+admins|admins)` | `sqli_confirmed` | يطبع جدولًا: `siteadmin \| $2b$… \| G0lden_Cage` → unlocks `creds_dumped` |
| `ssh-gate` | local | `^ssh\s+siteadmin@gate\.alfahras\.io` | `creds_dumped` | prompt، `expectInput: "G0lden_Cage"`, onSuccess `ssh_ok` + `switchHost: gateway` |

- كل `lockedOutput` قبل بلوغ الشرط = فشل أداة واقعي (`unable to connect` /
  `no injection point found`) لا يكشف قربك من الحل.
- ملاحظة تصميم: قاعدة `sqlmap-dump` عامة بما يكفي لتقبل صيغ الأمر الشائعة
  (`--dump -T admins`, `--dump-all`, `-D gate --dump`) كي لا يعاقب اللاعب على
  تفصيل نحوي — README §«الأمر يجب أن يعمل فعلًا».

### الأهداف
```jsonc
{ "id": "scan",   "title": "افحص الواجهة",            "done": "port_scan_done" }
{ "id": "probe",  "title": "اعثر على نقطة الحقن",      "done": "inj_point_found" }
{ "id": "inject", "title": "أكّد ثغرة الحقن",          "done": "sqli_confirmed" }
{ "id": "dump",   "title": "فرّغ جدول الإدارة",        "done": "creds_dumped" }
{ "id": "enter",  "title": "ادخل الخادم بحساب مدير",   "done": "ssh_ok" }
{ "id": "lead",   "title": "اقرأ إعداد الاتصال",       "done": "pay_lead" }
```

### الدليل (نقاط محورية)
- **probe** — concept: `nikto` يمسح إعدادات ومعاملات معروفة الخطورة؛ نقطة الحقن هي
  أي مدخل يصل إلى استعلام دون تنظيف.
- **inject/dump** — concept مطوّل: حقن SQL يحدث حين يُدمج مدخل المستخدم في نصّ
  الاستعلام بدل تمريره كمُعامل. `sqlmap` يؤتمت الاكتشاف ثم الاستخراج. الدرس
  المضادّ: الاستعلامات المُعامَلة (prepared statements) تُغلق الباب كلّه.
- **enter** — solution: كلمة مرور `siteadmin` خرجت من الـdump كنصّ صريح بجانب
  التجزئة (سوء تخزين ثانٍ)، استعملها في `ssh`.
- **lead** — hint: `cat /var/www/gate/config.php` يكشف خيط خادم الدفع `pay`.

### الإكمال
- `trigger: "pay_lead"`. `teaser`: «حسابات المشترين مجرّد أرقام. المال الحقيقي في
  محفظة مشفّرة على خادم الدفع. والتشفير قويّ بقدر كلمة المرور التي تحرسه.» → 06.

---

# 06 — «الخزنة»  ·  متوسط

```jsonc
"id": "06-the-vault",
"title": "الخزنة",
"difficulty": "medium",
"isFree": false,
"estimatedMinutes": 40,
"tagline": "محفظة الدفع مشفّرة. لكن المفتاح كلمة مرور، والكلمات تُكسر.",
"skills": ["كسر GPU", "نقل آمن scp", "تحوّل مستخدم su", "تصعيد SUID"]
```

**الفكرة التعليمية:** تعريف `hashcat` (كسر مسرّع على GPU، مقابل `john` المبني على
CPU في 01)، و`scp` (سحب الغنيمة إلى جهازك بدل قراءتها في مكانها)، و`su` (تحوّل
مستخدم بكلمة مرور، مقابل `sudo` في 01/02).

### الدخول
- `type: "message"`: «خادم الدفع `pay.alfahras.io`. المحفظة `wallet.kdbx`
  مشفّرة؛ مفتاحها تجزئة في ملف تركه المطوّر. اكسرها، تحوّل إلى مستخدم المحفظة،
  واسحبها إلى جهازك سليمة — لا تقرأها على خادمهم، فقد يُراقَب.»
- `mission`: اكسر تشفير المحفظة، وانقلها بأمان إلى جهازك المحلي.

### المضيفون
- `local` + `pay` (بعد `ssh_ok`، ندخله بحساب من خيط القضية 05: `deploy`).
- `pay` filesystem:
  - `/home/deploy/backups/keystore.hash` — التجزئة المطلوب كسرها
    (نوع KeePass، `hashcat -m 13400`).
  - `/home/wallet/wallet.kdbx` — الغنيمة، مملوكة للمستخدم `wallet`،
    `locked: "wallet"` (لا تُقرأ إلا بعد `su` إليه).
  - `/home/deploy/.bash_history` (مخفي) — سطر `su - wallet` يلمّح للمسار.
- `local` فيها `wordlists/common.txt` تنتهي بـ `Vault_Keeper!` (كلمة مرور المفتاح).

### الأدوات
`["ssh", "hashcat", "su", "scp", "find"]`

### مخطّط الأعلام
```
(ssh deploy@pay… )                          ─► ssh_ok (switchHost: pay) [بيانات من 05]
(find/ls → keystore.hash) ثم scp إلى local  ─► hash_local
(hashcat -m 13400 keystore.hash wordlist)   ─► key_cracked  (requires hash_local)
(su - wallet + password المكسور)             ─► user=wallet  (setUser)
(cat /home/wallet/wallet.kdbx)               ─► wallet_open  (locked: wallet)
(scp wallet@pay:/home/wallet/wallet.kdbx .)  ─► wallet_secured ← الإكمال (addFilesTo: local)
```

### قواعد الطرفية
| id | host | match | requires / user | فعل |
| -- | ---- | ----- | --------------- | --- |
| `ssh-pay` | local | `^ssh\s+deploy@pay\.alfahras\.io` | (كلمة مرور من 05) | onSuccess `ssh_ok` + `switchHost: pay` |
| `scp-hash-down` | local\|pay | `^scp\s+deploy@pay\S*keystore\.hash\s+\.?` | ssh_ok | onSuccess `addFiles` للـhash على `local` (`addFilesTo: local`) → unlocks `hash_local` |
| `hashcat-crack` | local | `^hashcat\s+-m\s+13400\s+.*keystore\.hash\s+\S*wordlists/` | `hash_local` | stream يطبع `…:Vault_Keeper!` → unlocks `key_cracked` |
| `su-wallet` | pay | `^su\s+-?\s*wallet` | — | prompt، `expectInput: "Vault_Keeper!"`, onSuccess `setUser: wallet` |
| `scp-wallet-down` | pay | `^scp\s+.*wallet\.kdbx\s+.*` | requiresUser `wallet` | `addFilesTo: local` يكتب `wallet.kdbx` محليًا → unlocks `wallet_secured` |

- `su-wallet` مع كلمة مرور خاطئة يطبع `su: Authentication failure` (`onFailure`).
- `wallet.kdbx` بـ `locked: "wallet"` يجعل `cat` قبل التحوّل يردّ Permission denied.
- درس `scp`: نُبقي `wallet_secured` مرتبطًا بالسحب لا بالقراءة، ليُكافَأ اللاعب على
  النقل الآمن فعلًا لا على مجرّد `cat`.

### الأهداف
```jsonc
{ "id": "foothold", "title": "ادخل خادم الدفع",          "done": "ssh_ok" }
{ "id": "pull",     "title": "اسحب تجزئة المفتاح",        "done": "hash_local" }
{ "id": "crack",    "title": "اكسر كلمة مرور المحفظة",    "done": "key_cracked" }
{ "id": "become",   "title": "تحوّل إلى مستخدم المحفظة",  "done": "wallet" }
{ "id": "secure",   "title": "انقل المحفظة بأمان",        "done": "wallet_secured" }
```

### الدليل (نقاط محورية)
- **pull** — concept: `scp` ينسخ عبر قناة SSH نفسها؛ نسحب التجزئة إلى عتادنا لأن
  الكسر عمل محليّ لا يُترك أثره على خادم الخصم.
- **crack** — concept: `hashcat -m <mode>` يحدّد نوع التجزئة (`13400` = KeePass)
  ويكسر على GPU أسرع من `john` بمراتب. الوضع الخاطئ = لا كسر؛ معرفة النوع نصف
  العمل.
- **become** — concept: `su` ينقلك إلى مستخدم آخر بكلمة مروره (مقابل `sudo` الذي
  ينفّذ أمرًا واحدًا). كلمة مرور المحفظة كانت أيضًا كلمة مرور حساب `wallet` —
  إعادة استخدام، وهي الخطيئة نفسها التي ظهرت في 01.
- **secure** — hint: `scp wallet@pay.alfahras.io:/home/wallet/wallet.kdbx .` /
  concept: أخذُ نسخة سليمة يحفظ الأدلّة؛ قراءتها في مكانها قد تنبّه الخصم.

### الإكمال
- `trigger: "wallet_secured"`. `teaser`: «المحفظة عندك، لكن مفاتيح التوقيع تُصدَر
  من خادم واحد لا يُرى من الخارج. من يوقّع، هو الساعي.» → 07.

---

# 07 — «الساعي»  ·  صعب

```jsonc
"id": "07-the-courier",
"title": "الساعي",
"difficulty": "hard",
"isFree": false,
"estimatedMinutes": 65,
"tagline": "كل الخيوط تنتهي عند خادم واحد لا يُرى. اجمعها، وادخله، واكشف الساعي.",
"skills": ["استطلاع DNS", "محور متعدّد الخوادم", "مُستمِع nc", "سلسلة تصعيد", "إسناد هوية"]
```

**الفكرة التعليمية:** الذروة — تجمع كل ما تعلّمه اللاعب: `dig` لكشف خادم داخلي،
حقن للحصول على موطئ قدم، **مُستمِع `nc`** يلتقط صدفة عكسية من وظيفة مجدولة، ثم
سلسلة تصعيد عبر SUID، وأخيرًا إسناد هوية «الساعي» من آثاره. أطول مخطّط أعلام
وأكثر تشعّبًا.

### الدخول
- `type: "dossier"`: ملفّ مجمّع من العمليات السابقة (`buyers.csv`, `config.php`,
  `wallet.kdbx`) كلها تشير إلى خادم توقيع `sign.internal.alfahras.io` غير مُعلَن.
- `mission`: اكشف خادم التوقيع الداخلي، ادخله، جمّد إصدار المفاتيح، واستخرج ما
  يُسند هوية «الساعي».

### المضيفون
ثلاثة، والمحور جوهر الصعوبة:
- `local` (ekhtrq).
- `gateway` (نقطة الارتكاز، من خيط 05؛ نعيد استعمالها كنقطة انطلاق داخلية).
- `sign` (خادم التوقيع الداخلي — لا يُرى من `local`، يُدخَل من `gateway` فقط).

`sign` filesystem:
- `/opt/sign/cron/rotate.sh` — سكربت مجدول يتّصل خارجًا كل دقيقة (ذريعة الصدفة
  العكسية عبر `nc`).
- `/home/signer/.bash_history` (مخفي) — أثر يربط المشغّل بـ«الساعي».
- `/root/identity.txt` (`locked: root`) — الغنيمة: اسم الساعي الحقيقي وحساباته،
  `unlocks: courier_unmasked`.
- `/root/freeze.sh` (`locked: root`) — تشغيله يجمّد إصدار المفاتيح
  → `unlocks: market_frozen`.

### الأدوات
`["dig", "nmap", "sqlmap", "nc", "hydra", "ssh", "sudo", "find", "scp"]`

### مخطّط الأعلام (الأطول)
```
(gateway) dig sign.internal.alfahras.io +short   ─► internal_host_found
(gateway) nmap 10.10.0.9                          ─► int_ports (منفذ 8080 لوحة داخلية)
(gateway) sqlmap على لوحة 8080 → موطئ www-data    ─► panel_foothold (requires int_ports)
   │  (اللوحة تشغّل rotate.sh كل دقيقة كـ signer)
(gateway) nc -lvp 4444  ← يلتقط صدفة signer        ─► shell_caught  (requires panel_foothold)
   │  onSuccess: switchHost: sign, user=signer
(sign) find / -perm -4000 → يكشف SUID مُهيّأ خطأً  ─► suid_found
(sign) استغلال الـSUID (GTFOBins)                  ─► user=root
(sign) cat /root/identity.txt                      ─► courier_unmasked
(sign) sh /root/freeze.sh (requires root)          ─► market_frozen ← الإكمال
```

### قواعد الطرفية (المحورية)
| id | host | match | requires / user | فعل |
| -- | ---- | ----- | --------------- | --- |
| `dig-internal` | gateway | `^dig\s+.*sign\.internal\.alfahras\.io` | — | يطبع `10.10.0.9` → unlocks `internal_host_found` |
| `nmap-internal` | gateway | `^nmap\s+.*(10\.10\.0\.9\|sign\.internal)` | `internal_host_found` | يظهر `8080/tcp open http` → unlocks `int_ports` |
| `sqlmap-panel` | gateway | `^sqlmap\s+-u\s+["']?https?://(10\.10\.0\.9\|sign\.internal)\S*` | `int_ports` | unlocks `panel_foothold` + يطبع تلميحًا واقعيًا أن اللوحة تشغّل مهمّة كل دقيقة |
| `nc-listen` | gateway | `^nc\s+-lv?p\s+4444` | `panel_foothold` | delayMs عالٍ ثم يطبع `connect to \[…] from sign … signer@sign:$` → onSuccess `switchHost: sign`, `setUser: signer`, unlocks `shell_caught` |
| `find-suid` | sign | `^find\s+/\s+-perm\s+-4000` | — | يظهر ثنائيًا غير قياسي (مثلًا `/usr/bin/env`) → unlocks `suid_found` |
| `suid-escalate` | sign | `^(/usr/bin/)?env\s+/bin/sh` أو صيغة GTFOBins للثنائي المكشوف | `suid_found` | onSuccess `setUser: root` |
| `freeze` | sign | `^(sudo\s+)?(sh\|bash\s+)?\S*freeze\.sh` | requiresUser `root` | unlocks `market_frozen`، يطبع تأكيد تجميد الإصدار |

- **درس `nc`:** المُستمِع لا «يهاجم»؛ ينتظر اتصالًا. المُهاجَم (اللوحة) هو من
  يتّصل بنا لأن السكربت المجدول يُشغَّل دوريًا. delayMs طويل يجسّد «الانتظار حتى
  الدقيقة التالية». هذا أهمّ مفهوم جديد في القضية.
- `lockedOutput` لـ `nc-listen` قبل `panel_foothold`: `listening on … ` ثم لا شيء
  (مُستمِع صامت لا يُسرّب أن شيئًا سيأتي) — الفشل لا يميّز القريب عن التائه.
- إعادة استخدام درس 01: `find / -perm -4000` نفس القاعدة الموجودة في 01، لكن هنا
  النتيجة تكشف ثنائيًا قابلًا للاستغلال بدل قائمة عادية.

### المتصفح / DNS
- لا بحث ويب عام؛ `dig` من `gateway` هو أداة الكشف. (يمكن إضافة `sites` للوحة
  الداخلية إن أردنا للاعب أن يراها في المتصفح المحلي عبر نفق، لكن الأبسط إبقاؤها
  عبر `sqlmap` من الطرفية.)

### الأهداف
```jsonc
{ "id": "resolve",  "title": "اكشف الخادم الداخلي",       "done": "internal_host_found" }
{ "id": "map",      "title": "افحص منافذه",               "done": "int_ports" }
{ "id": "foothold", "title": "خذ موطئ قدم في اللوحة",     "done": "panel_foothold" }
{ "id": "catch",    "title": "التقط الصدفة العكسية",       "done": "shell_caught" }
{ "id": "suid",     "title": "اعثر على ثنائي SUID مُهيّأ خطأً", "done": "suid_found" }
{ "id": "root",     "title": "صعّد إلى root",             "done": "root" }
{ "id": "unmask",   "title": "اكشف هوية الساعي",          "done": "courier_unmasked" }
{ "id": "freeze",   "title": "جمّد إصدار المفاتيح",        "done": "market_frozen" }
```

### الدليل (نقاط محورية)
- **resolve** — concept: `dig` يسأل خوادم الأسماء مباشرة؛ نطاق فرعي داخلي قد
  يُحلّ إلى عنوان خاص لم يُقصد كشفه.
- **catch** — concept مطوّل: الصدفة العكسية تقلب الاتجاه — بدل أن نتّصل بالهدف،
  نجعله يتّصل بنا، فنتجاوز جدرانًا تمنع الاتصال الوارد لكنها تسمح بالصادر.
  `nc -lvp 4444` يفتح أذنًا، والوظيفة المجدولة على اللوحة هي من يطرق البابنا.
- **suid/root** — concept: بتّ SUID يجعل الثنائي يعمل بصلاحية مالكه؛ ثنائي مالكه
  root وقادر على تشغيل صدفة (GTFOBins) = جسر إلى root. نفس منطق 01 بأداة مختلفة —
  الدرس يتراكم لا يتكرّر.
- **unmask** — concept: الإسناد (attribution). الاسم لا يُخترع، يُستنتج من آثار:
  `.bash_history`، ملكية الملفات، سطر توقيع. الساعي الذي لم يلمس لوحة مفاتيح ترك
  رغم ذلك بصمات على من يوقّع نيابةً عنه.
- **freeze** — concept: العملية الأخلاقية تُغلَق بإيقاف الضرر لا بمجرّد كشفه؛
  التجميد يمنع بيع الدفعة التالية.

### الإكمال
- `trigger: "market_frozen"`.
- `message`: «الإصدار مجمّد، والهوية موثّقة ومسلّمة لفريق الاستجابة. السوق توقّف،
  والساعي لم يعد اسمًا مجهولًا.»
- `teaser`: نهاية القوس — أو بذرة موسم ثانٍ إن أُريد («لكن من اشترى القائمة الأولى
  ما زال طليقًا…»).

---

## قائمة تحقّق قبل تحويل أي خطة إلى JSON

مأخوذة من [`src/cases/README.md`](../src/cases/README.md) §«قبل أن تُودِع»:

- [ ] `id` يطابق اسم الملف (`NN-slug.json` ↔ `"id": "NN-slug"`).
- [ ] كل هدف يُكمَل بعلَم يمنحه شيء فعلًا (المُدقّق يرفض علَمًا يتيمًا).
- [ ] كل أداة في `tools` لها إدخال في `_shared/toolbox.json` — الخمس القضايا لا
      تحتاج إدخالًا جديدًا.
- [ ] كل سطر `code` في الدليل تطابقه قاعدة طرفية (وإلا فشل البناء).
- [ ] `lockedOutput` وكل فشل خارج المسار يقرأ كخطأ أداة عادي — لا تسريب.
- [ ] العب من البداية للنهاية؛ كل هدف ينقلب.
- [ ] `pnpm lint` و`npx tsc --noEmit` يمرّان، والمُحمِّل يتحقّق أثناء `next build`.

## ملاحظات نشر

- هذه القضايا **مسودّات**؛ لإبقائها خارج الواجهة اتركها هنا أو ضعها في
  `src/cases/_drafts/` كما فُعِل مع `02-the-market.json` (المُحمِّل يقرأ جذر
  `src/cases/` فقط، لا `_drafts/`).
- عند النشر: انقل الملف إلى `src/cases/NN-slug.json`، ثم شغّل `listCases()` (أو
  ابنِ) للتحقّق من المانيفست دفعةً واحدة.
- التسعير: راجع [`PRICING.md`](PRICING.md) — 03 مقترحة كقضية مجانية ثانية
  (`isFree: true`) لأنها تعلّم التعداد بلا كسر تجزئة، وتوسّع القمع قبل الجدار
  المدفوع.
