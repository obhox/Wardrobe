--
-- PostgreSQL database dump
--

\restrict BhTdEYZYmG4njbASpA5w1EZZQddlHgl0FomIoYvtbiR1urkiAQdzpiEUEr07IR5

-- Dumped from database version 18.4 (Debian 18.4-1.pgdg13+1)
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ItemStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ItemStatus" AS ENUM (
    'owned',
    'want'
);


--
-- Name: LayoutMode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LayoutMode" AS ENUM (
    'free',
    'grid',
    'shelves',
    'columns',
    'gallery'
);


--
-- Name: SortKey; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SortKey" AS ENUM (
    'recent',
    'color',
    'section',
    'status',
    'az'
);


--
-- Name: SourceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SourceType" AS ENUM (
    'manual',
    'scraped'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Item" (
    id text NOT NULL,
    "wardrobeId" text NOT NULL,
    "sectionId" text,
    "imageUrl" text NOT NULL,
    "cutoutUrl" text,
    "sourceUrl" text,
    name text NOT NULL,
    brand text,
    price double precision,
    currency text DEFAULT 'USD'::text,
    status public."ItemStatus" DEFAULT 'owned'::public."ItemStatus" NOT NULL,
    "boughtAt" text,
    "purchasedAt" timestamp(3) without time zone,
    notes text,
    "targetPrice" double precision,
    priority integer,
    "posX" double precision DEFAULT 0 NOT NULL,
    "posY" double precision DEFAULT 0 NOT NULL,
    rotation double precision DEFAULT 0 NOT NULL,
    "sizeTier" text DEFAULT 'medium'::text NOT NULL,
    hue integer DEFAULT 0 NOT NULL,
    "sourceType" public."SourceType" DEFAULT 'manual'::public."SourceType" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Passkey; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Passkey" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "credentialId" text NOT NULL,
    "publicKey" bytea NOT NULL,
    counter bigint DEFAULT 0 NOT NULL,
    transports text,
    "deviceLabel" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RecoveryQuestion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RecoveryQuestion" (
    id text NOT NULL,
    "userId" text NOT NULL,
    prompt text NOT NULL,
    "answerHash" text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL
);


--
-- Name: Section; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Section" (
    id text NOT NULL,
    "wardrobeId" text NOT NULL,
    name text NOT NULL,
    icon text,
    color text,
    "order" integer DEFAULT 0 NOT NULL,
    shared boolean DEFAULT true NOT NULL
);


--
-- Name: Session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Sticker; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Sticker" (
    id text NOT NULL,
    "wardrobeId" text NOT NULL,
    kind text NOT NULL,
    "posX" double precision DEFAULT 0 NOT NULL,
    "posY" double precision DEFAULT 0 NOT NULL,
    rotation double precision DEFAULT 0 NOT NULL,
    scale double precision DEFAULT 1 NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    handle text NOT NULL,
    "displayName" text,
    "combinationHash" text NOT NULL,
    "lookupHash" text NOT NULL,
    "recoveryCardHash" text,
    "recoveryEmail" text,
    "dialPinHash" text,
    avatar text,
    "defaultTheme" text DEFAULT 'daylight'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Wardrobe; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Wardrobe" (
    id text NOT NULL,
    "ownerId" text NOT NULL,
    title text DEFAULT 'my wardrobe'::text NOT NULL,
    tagline text,
    ground text DEFAULT 'daylight'::text NOT NULL,
    pattern text DEFAULT 'none'::text NOT NULL,
    accent text DEFAULT 'cobalt'::text NOT NULL,
    "layoutMode" public."LayoutMode" DEFAULT 'free'::public."LayoutMode" NOT NULL,
    "sortKey" public."SortKey" DEFAULT 'recent'::public."SortKey" NOT NULL,
    "shareCode" text,
    visibility text DEFAULT 'private'::text NOT NULL,
    "shareDetails" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: WebAuthnChallenge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WebAuthnChallenge" (
    id text NOT NULL,
    "userId" text,
    challenge text NOT NULL,
    kind text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Data for Name: Item; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Item" (id, "wardrobeId", "sectionId", "imageUrl", "cutoutUrl", "sourceUrl", name, brand, price, currency, status, "boughtAt", "purchasedAt", notes, "targetPrice", priority, "posX", "posY", rotation, "sizeTier", hue, "sourceType", "createdAt") FROM stdin;
cmqsxi2nm0017mnjc5xtifsyx	cmqsvnq3h0004mnjcs2mp7qr0	cmqsvnq3h0005mnjcti1b8bd9	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/00dfd10a958cf64879fb52c3e7e9599d85102759.jpeg	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/00dfd10a958cf64879fb52c3e7e9599d85102759.jpeg	https://amko-ts.com/products/pique-polo/4037060?location=134682	Pique Polo	Amko Apparel	30000	NGN	owned	\N	\N	\N	\N	\N	0.9196059790122915	0.4154607494883021	-1.796728030203667	medium	0	scraped	2026-06-25 03:14:34.355
cmqsx5y3z000smnjczak8hope	cmqsvnq3h0004mnjcs2mp7qr0	cmqsvnq3h0005mnjcti1b8bd9	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/5caea9f56d314aa08d4ce1cfcc25fa8f97641000.jpeg	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/5caea9f56d314aa08d4ce1cfcc25fa8f97641000.jpeg	https://amko-ts.com/products/linen-polo/4481070?location=134682	Linen Polo	Amko Apparel	35000	NGN	want	\N	\N	\N	\N	\N	0.404926909900311	0.6667069243983134	0.6339763759315247	hero	0	scraped	2026-06-25 03:05:08.591
cmqsvp24e000bmnjcheotuks0	cmqsvnq3h0004mnjcs2mp7qr0	cmqsvnq3h0006mnjct0xgeeev	https://themix.ng/cdn/shop/files/398846_02_sv01.jpg?v=1765895344&width=2048	https://themix.ng/cdn/shop/files/398846_02_sv01.jpg?v=1765895344&width=2048	https://themix.ng/products/puma-speedcat-og-sneakers-1?variant=47619449290988&country=NG&currency=NGN&utm_medium=product_sync&utm_source=google&utm_content=sag_organic&utm_campaign=sag_organic&gad_source=1&gad_campaignid=23937172939&gbraid=0AAAAA_3hsHku_7xvIlzNIvae5SHK1NGT-&gclid=CjwKCAjwgO7RBhBKEiwAZNP85ntZDbNwcran4xGh5uaamC4nL2-2xEnb2wvUkQClg5R03U3dYUcA0BoCqVoQAvD_BwE	PUMA Speedcat OG Sneakers Unisex	THE MIX	\N	USD	want	\N	\N	\N	350	\N	0.6424028828757479	0.6730747263871765	-2.207634284386586	hero	353	scraped	2026-06-25 02:24:01.023
cmqsxeg3d0013mnjcen6cw4hp	cmqsvnq3h0004mnjcs2mp7qr0	cmqsvnq3h0005mnjcti1b8bd9	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/e1ac03f8fb0cbeabb7de4e52cbbb45b640a08acb.jpeg	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/e1ac03f8fb0cbeabb7de4e52cbbb45b640a08acb.jpeg	https://amko-ts.com/products/stone-wash-280g-tshirt/2987962?location=134682	Stone Wash 280G Tshirt	Amko Apparel	18000	NGN	owned	\N	\N	\N	\N	\N	0.2410163598489817	0.6639618285780671	-1.988843495608307	medium	0	scraped	2026-06-25 03:11:45.145
cmqsxhbgn0015mnjcyq7nn0x5	cmqsvnq3h0004mnjcs2mp7qr0	cmqsvnq3h0005mnjcti1b8bd9	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/5dee67623e55c086bdf86eae24cb50ee84ccfbec.jpeg	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/5dee67623e55c086bdf86eae24cb50ee84ccfbec.jpeg	https://amko-ts.com/products/henley-tshirt/4779098?location=134682	Henley Tshirt	Amko Apparel	25000	NGN	want	\N	\N	\N	25000	\N	0.07429736548341073	0.6884477588916889	-2.347951353271128	medium	0	scraped	2026-06-25 03:13:59.111
cmqsxkvj6001dmnjclm92415a	cmqsvnq3h0004mnjcs2mp7qr0	cmqsvnq3h0005mnjcti1b8bd9	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/bc254354a85f3a99dacc008c057af988841ae605.jpeg	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/bc254354a85f3a99dacc008c057af988841ae605.jpeg	https://amko-ts.com/products/linen-shirt-white/2688315?location=134682	Linen Shirt - White	Amko Apparel	23000	NGN	owned	Amko	\N	\N	\N	\N	0.7480090865625425	0.4281698818796576	-1.80719356998452	medium	0	scraped	2026-06-25 03:16:45.09
cmqsxn2ev001fmnjcbbnanqwk	cmqsvnq3h0004mnjcs2mp7qr0	cmqsvnq3h0005mnjcti1b8bd9	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/6f9eca0c18f4a1a1a43f82625d13908aefd3c133.jpeg	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/6f9eca0c18f4a1a1a43f82625d13908aefd3c133.jpeg	https://amko-ts.com/products/quater-zipped-sweatshirt/3364754?location=134682	Quater-Zipped Sweatshirt	Amko Apparel	26000	NGN	owned	\N	\N	\N	\N	\N	0.6065226225863164	0.3943857767147576	0.587862469124957	medium	0	scraped	2026-06-25 03:18:27.32
cmqsxpnjc001hmnjcyl5ncgp3	cmqsvnq3h0004mnjcs2mp7qr0	cmqsvnq3h0005mnjcti1b8bd9	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/e9bcbdc6b7f824c66f4a918c2cfb3471afcac987.jpeg	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/e9bcbdc6b7f824c66f4a918c2cfb3471afcac987.jpeg	https://amko-ts.com/products/merino-wool-cardigan/4706595?location=134682	Merino Wool Cardigan	Amko Apparel	35000	NGN	want	\N	\N	\N	\N	\N	0.3972061579645621	0.4132602432336444	-0.3981826874914987	medium	0	scraped	2026-06-25 03:20:28.008
cmqsxr0j8001lmnjcby795l3i	cmqsvnq3h0004mnjcs2mp7qr0	cmqsxqp66001jmnjc9iis8ad9	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/cb23e9eda2e236cdda7869a67f30e7b4fd0283da.jpeg	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/cb23e9eda2e236cdda7869a67f30e7b4fd0283da.jpeg	https://amko-ts.com/products/ice-silk-pants/2599788?location=134682	Ice-Silk Pants	Amko Apparel	23000	NGN	owned	\N	\N	\N	\N	\N	0.2644139621139402	0.4160163598489817	-1.398439836091711	medium	0	scraped	2026-06-25 03:21:31.508
cmqsxruug001nmnjc6nsv11v7	cmqsvnq3h0004mnjcs2mp7qr0	cmqsvnq3h0005mnjcti1b8bd9	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/529ffcde1a9abddfe8e294fe28b322d512bf11c0.jpeg	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/529ffcde1a9abddfe8e294fe28b322d512bf11c0.jpeg	https://amko-ts.com/products/retro-washed-tshirt/2216143?location=134682	Retro Washed Tshirt	Amko Apparel	18000	NGN	owned	\N	\N	\N	\N	\N	0.0638589168051961	0.4159640321500774	-3.892101740420912	medium	0	scraped	2026-06-25 03:22:10.793
cmqsxutvw001rmnjcfjm6fiqa	cmqsvnq3h0004mnjcs2mp7qr0	cmqsxu4a2001pmnjccmm6gl9b	https://ng.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/33/9682914/1.jpg?6148	https://ng.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/33/9682914/1.jpg?6148	https://www.jumia.com.ng/2720-flip-2.8-4g-lte-dual-sim-black-nokia-mpg11958390.html	Nokia  2720 Flip - 2.8" - 4G LTE - Dual Sim - Black	Jumia Nigeria	30000	NGN	owned	\N	\N	\N	\N	\N	0.9199879640505484	0.1779393123456248	2.882792422788043	medium	0	scraped	2026-06-25 03:24:29.516
cmqsysuop0003mnpd9uq8kzya	cmqsvnq3h0004mnjcs2mp7qr0	cmqswq1d8000omnjcwveb0hzt	https://aramiessentials.com/wp-content/uploads/2024/07/glow-oil-unscented-scaled-1-1536x2048-1-1-768x1024.jpeg	https://aramiessentials.com/wp-content/uploads/2024/07/glow-oil-unscented-scaled-1-1536x2048-1-1-768x1024.jpeg	https://aramiessentials.com/product/glow-oil/	Glow Oil - Arami Essentials	Arami Essentials	5116	NGN	want	\N	\N	\N	\N	\N	0.8135629250323714	0.6547083439023673	-7.531970686116966	large	0	scraped	2026-06-25 03:50:56.858
cmqsxxbge001tmnjcc87hrlqn	cmqsvnq3h0004mnjcs2mp7qr0	cmqsxxgo7001vmnjcursczvzv	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/688a45251ecc6170cbcd376159702dea1d21cccd.jpeg	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/688a45251ecc6170cbcd376159702dea1d21cccd.jpeg	https://amko-ts.com/products/amko-elite-cap/3835399?location=134682	Amko Elite Cap	Amko Apparel	18000	NGN	owned	\N	\N	\N	\N	\N	0.7485402535895264	0.1730090865625425	-3.894883305627445	medium	0	scraped	2026-06-25 03:26:25.598
cmqsxyylf001xmnjcw7v6t56p	cmqsvnq3h0004mnjcs2mp7qr0	cmqsvnq3h0005mnjcti1b8bd9	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/1a9a14a0691eba5d71a528d6e960ecdb29bc9e9b.jpeg	https://dodptt9f4zk9h.cloudfront.net/stores/131035/products/1a9a14a0691eba5d71a528d6e960ecdb29bc9e9b.jpeg	https://amko-ts.com/products/plain-long-sleeve-tshirt/4182656?location=134682	Plain Long Sleeve Tshirt	Amko Apparel	17000	NGN	owned	\N	\N	\N	\N	\N	0.5871297056243869	0.1680078008195414	0.6642594767763512	medium	0	scraped	2026-06-25 03:27:42.244
cmqsy6iah001zmnjc0697x9zg	cmqsvnq3h0004mnjcs2mp7qr0	cmqsxu4a2001pmnjccmm6gl9b	https://hub360.cc/web/image/product.template/10604/image_1024?unique=1c4a6b4	https://hub360.cc/web/image/product.template/10604/image_1024?unique=1c4a6b4	https://hub360.cc/shop/0702-raspberry-pi-5-8gb-ram-10604?page=4&category=292&_gl=1*15i8h2n*_up*MQ..*_gs*MQ..&gclid=CjwKCAjwgO7RBhBKEiwAZNP85lDkETjqU634pj_E8edMuW5C9Xd3klsPBT0hrmNwMadmqOoYn7CTDBoCTY8QAvD_BwE&gbraid=0AAAAADjWdVHTpL5wjfPuzEcf2zqiB2aem	Raspberry Pi 5 (8GB RAM)	Hub360	\N	USD	want	\N	\N	\N	\N	\N	0.4169388960280291	0.1555394912978954	-0.2919492820947198	medium	0	scraped	2026-06-25 03:33:34.361
cmqsyahhh0021mnjcwyzb7m67	cmqsvnq3h0004mnjcs2mp7qr0	\N	https://smileys.africa/wp-content/uploads/2025/11/DIBU9572copy.webp	https://smileys.africa/wp-content/uploads/2025/11/DIBU9572copy.webp	https://smileys.africa/product/smileys-deuces-blue/	Smileys Deuces Blue - Smiley Socks Company	Smiley Socks Company	1	USD	want	\N	\N	\N	1	\N	0.2499137525578408	0.1894139621139402	0.7592744582107116	medium	0	scraped	2026-06-25 03:36:39.942
cmqsyd9o60023mnjc9nq2w33l	cmqsvnq3h0004mnjcs2mp7qr0	cmqsxu4a2001pmnjccmm6gl9b	https://i0.wp.com/noirstalgiaavenue.com/wp-content/uploads/2025/09/IMG_3370.png?fit=2100%2C1500&ssl=1	https://i0.wp.com/noirstalgiaavenue.com/wp-content/uploads/2025/09/IMG_3370.png?fit=2100%2C1500&ssl=1	https://noirstalgiaavenue.com/product/panasonic-lumix-tz56/	Panasonic lumix tz55	Noirstalgia Avenue	1	USD	want	\N	\N	\N	1	\N	0.07044327810877196	0.1555255834718628	0.05444587227248121	large	219	scraped	2026-06-25 03:38:49.782
cmqsyrdmj0001mnpdltmx4xgu	cmqsvnq3h0004mnjcs2mp7qr0	cmqswq1d8000omnjcwveb0hzt	https://aramiessentials.com/wp-content/uploads/2024/10/AramiEssentialsDreamButter-1-scaled.jpg	https://aramiessentials.com/wp-content/uploads/2024/10/AramiEssentialsDreamButter-1-scaled.jpg	https://aramiessentials.com/product/dream-butter-ores-cheesecake/	Dream Butter (Ore's Cheesecake) - Arami Essentials	Arami Essentials	6605	NGN	want	\N	\N	\N	\N	\N	0.4997140380281549	0.4296508695944525	4.025823213646118	medium	0	scraped	2026-06-25 03:49:48.091
\.


--
-- Data for Name: Passkey; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Passkey" (id, "userId", "credentialId", "publicKey", counter, transports, "deviceLabel", "createdAt") FROM stdin;
\.


--
-- Data for Name: RecoveryQuestion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RecoveryQuestion" (id, "userId", prompt, "answerHash", "order") FROM stdin;
cmqsvnq3h0002mnjcy8zyj6ol	cmqsvnq3h0001mnjczoryam18	my name	$argon2id$v=19$m=19456,t=2,p=1$1BMnu4cXSQxS4sNmflq45Q$3Z7BV4ONOkC4dnSR8ronj4wqj/GUMiMkGQRcyri5wqk	0
cmqsvnq3h0003mnjcd4k8d919	cmqsvnq3h0001mnjczoryam18	maiden name	$argon2id$v=19$m=19456,t=2,p=1$RYbMsJe7AXZvsh06ls9nlQ$u7c3o/A/lvv1BWAc+ymILHyzBxc2KNbBEkfnaAmrbpk	1
cmqt0ipq30001lr01x2akse1x	cmqt0ipq30000lr01mxnb70ba	my name	$argon2id$v=19$m=19456,t=2,p=1$mJ/tteb4xDYeRCHoOssHgg$u/RYeVNauqE1DtkkSO4yUhppgKJEul+y+2CwU/5cFH4	0
cmqt0ipq30002lr018sjowkhu	cmqt0ipq30000lr01mxnb70ba	maiden name	$argon2id$v=19$m=19456,t=2,p=1$leo9gjAAf7EDzXzhL8JJxQ$/p8b3AS/AsLJm+wHYXiCpQ8B10U4Dz3gqy7/v3Ul9Zg	1
\.


--
-- Data for Name: Section; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Section" (id, "wardrobeId", name, icon, color, "order", shared) FROM stdin;
cmqsvnq3h0005mnjcti1b8bd9	cmqsvnq3h0004mnjcs2mp7qr0	tops	✦	cobalt	0	t
cmqsvnq3h0006mnjct0xgeeev	cmqsvnq3h0004mnjcs2mp7qr0	shoes	✦	terracotta	1	t
cmqsvnq3h0007mnjcyiv07fxy	cmqsvnq3h0004mnjcs2mp7qr0	bags	✦	honey	2	t
cmqswq1d8000omnjcwveb0hzt	cmqsvnq3h0004mnjcs2mp7qr0	body	✦	\N	3	t
cmqsx81zj000vmnjce7b0tbdx	cmqsx81zj000umnjcdtew0lkv	tops	✦	cobalt	0	t
cmqsx81zj000wmnjcvwurro9f	cmqsx81zj000umnjcdtew0lkv	shoes	✦	terracotta	1	t
cmqsx81zj000xmnjc6t9h1l65	cmqsx81zj000umnjcdtew0lkv	bags	✦	honey	2	t
cmqsxu4a2001pmnjccmm6gl9b	cmqsvnq3h0004mnjcs2mp7qr0	gadgets	✦	\N	5	t
cmqsxqp66001jmnjc9iis8ad9	cmqsvnq3h0004mnjcs2mp7qr0	trousers	✦	\N	4	t
cmqsxxgo7001vmnjcursczvzv	cmqsvnq3h0004mnjcs2mp7qr0	cap	✦	\N	6	t
cmqt0ipq30004lr01cx39b7hp	cmqt0ipq30003lr01zbrj23e3	tops	✦	cobalt	0	t
cmqt0ipq30005lr012ilt0xs5	cmqt0ipq30003lr01zbrj23e3	shoes	✦	terracotta	1	t
cmqt0ipq30006lr01m9kymc23	cmqt0ipq30003lr01zbrj23e3	bags	✦	honey	2	t
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Session" (id, "userId", token, "expiresAt", "createdAt") FROM stdin;
cmqsxdiyt0011mnjcnuvi82il	cmqsvnq3h0001mnjczoryam18	pPduW_zb8E6-hsJ6i1DraZLEToQNam_68EKyEBsrB7k	2026-07-25 03:11:02.213	2026-06-25 03:11:02.214
cmqt0l5gg000alr01nxefoc35	cmqt0ipq30000lr01mxnb70ba	TrssZxe4okBZS6Bil0QOjihM7hViJe-W0ol7vXN24kk	2026-07-25 04:40:56.8	2026-06-25 04:40:56.801
\.


--
-- Data for Name: Sticker; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Sticker" (id, "wardrobeId", kind, "posX", "posY", rotation, scale) FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, handle, "displayName", "combinationHash", "lookupHash", "recoveryCardHash", "recoveryEmail", "dialPinHash", avatar, "defaultTheme", "createdAt") FROM stdin;
cmqsvnq3h0001mnjczoryam18	silk-6	\N	$argon2id$v=19$m=19456,t=2,p=1$CZJvjWnEg8tfITAxJt+aBA$DKeuP3BNC0cTbrDFezCjKZLMEEqFS8ul+ofNcSaTZ5Q	df475237890d470ae1a10fd3cfc01e531a4e6582c75c66fccf86c1a9642c7c0a	$argon2id$v=19$m=19456,t=2,p=1$YDc9CKLXT/mz8+AQZEXYgA$ier9DFYQRiHW3YJ9KVX5n6plrVX8qewY7U4xuAHN8Os	\N	\N	\N	daylight	2026-06-25 02:22:58.782
cmqsx81zj000tmnjcbt1aspkb	obhox	\N	$argon2id$v=19$m=19456,t=2,p=1$VqLvj9vFTnz+gt3llPHrHw$kwqjT4YysAlvxTZgfDbFrjTE57KyclwkHCkPVYwhgi8	dc9e139706418613e81888c1111e636928388a624170877d3bca493af48910a1	$argon2id$v=19$m=19456,t=2,p=1$mVolHJ7M646vkgbuwjfXnQ$JF/6dqEP/NcGtSbQJV9njOSI9TMPFCdzGNEJ2XORya8	\N	\N	\N	daylight	2026-06-25 03:06:46.928
cmqt0ipq30000lr01mxnb70ba	tona	\N	$argon2id$v=19$m=19456,t=2,p=1$5GSmyjYQWsJyeH4+hdVB/A$6BTRkpj0XdRCkLyYQ5E0C4UCMVrJfeEl0E8eC7HC0hM	8c7e3622e37572b647378706ae9a8da82c362b2b323626dda2ecc1f8874b0cf6	$argon2id$v=19$m=19456,t=2,p=1$XABSPDIxBLu34h9tMHfdMA$/PlfKSDMdAE6knjAFERfPom9XvV5kwqHUZGdzih15vA	\N	\N	\N	daylight	2026-06-25 04:39:03.1
\.


--
-- Data for Name: Wardrobe; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Wardrobe" (id, "ownerId", title, tagline, ground, pattern, accent, "layoutMode", "sortKey", "shareCode", visibility, "shareDetails", "createdAt") FROM stdin;
cmqsx81zj000umnjcdtew0lkv	cmqsx81zj000tmnjcbt1aspkb	obhox's wardrobe	everything, arranged just so.	daylight	none	cobalt	free	recent	\N	private	f	2026-06-25 03:06:46.928
cmqsvnq3h0004mnjcs2mp7qr0	cmqsvnq3h0001mnjczoryam18	Joy's wardrobe	everything, arranged just so.	daylight	polka	cobalt	free	recent	MUHejTBjJot2eoIo	unlisted	t	2026-06-25 02:22:58.782
cmqt0ipq30003lr01zbrj23e3	cmqt0ipq30000lr01mxnb70ba	tona's wardrobe	everything, arranged just so.	daylight	none	cobalt	free	recent	\N	private	f	2026-06-25 04:39:03.1
\.


--
-- Data for Name: WebAuthnChallenge; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WebAuthnChallenge" (id, "userId", challenge, kind, "expiresAt", "createdAt") FROM stdin;
cmqsvm1yy0000mnjcaao66x7g	\N	1Fly6R0ZQiAx55H7fi7tgyI64PnR2zQ8a2fBEI-Kx_I	authenticate	2026-06-25 02:26:40.803	2026-06-25 02:21:40.857
cmqsw3dwi000imnjcjtyzlbu2	\N	OsdLgK-z4_nhqQqCj26_MNw1BPd034g2T5TyHAgImjk	authenticate	2026-06-25 02:40:09.472	2026-06-25 02:35:09.474
cmqsztmkz0000pb0143tljumc	\N	4G-uVctadx4SSZdAUuTmx1U-9aeKn4gkeIt6m1uZWAY	authenticate	2026-06-25 04:24:32.626	2026-06-25 04:19:32.627
cmqszvd160001pb018g5bkne1	\N	rRCVsrDoOSl6i-WdyHdhB7KtJ2m9QZuojUd1OjSZGeE	authenticate	2026-06-25 04:25:53.561	2026-06-25 04:20:53.562
cmqszve3f0002pb01akb2kvce	\N	_oQe4PhfLi6ZcTkLjoSvnio-rWCJ5D87khZvvRZAP48	authenticate	2026-06-25 04:25:54.938	2026-06-25 04:20:54.939
\.


--
-- Name: Item Item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Item"
    ADD CONSTRAINT "Item_pkey" PRIMARY KEY (id);


--
-- Name: Passkey Passkey_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Passkey"
    ADD CONSTRAINT "Passkey_pkey" PRIMARY KEY (id);


--
-- Name: RecoveryQuestion RecoveryQuestion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecoveryQuestion"
    ADD CONSTRAINT "RecoveryQuestion_pkey" PRIMARY KEY (id);


--
-- Name: Section Section_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Section"
    ADD CONSTRAINT "Section_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: Sticker Sticker_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sticker"
    ADD CONSTRAINT "Sticker_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Wardrobe Wardrobe_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Wardrobe"
    ADD CONSTRAINT "Wardrobe_pkey" PRIMARY KEY (id);


--
-- Name: WebAuthnChallenge WebAuthnChallenge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WebAuthnChallenge"
    ADD CONSTRAINT "WebAuthnChallenge_pkey" PRIMARY KEY (id);


--
-- Name: Item_sectionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Item_sectionId_idx" ON public."Item" USING btree ("sectionId");


--
-- Name: Item_wardrobeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Item_wardrobeId_idx" ON public."Item" USING btree ("wardrobeId");


--
-- Name: Passkey_credentialId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Passkey_credentialId_key" ON public."Passkey" USING btree ("credentialId");


--
-- Name: Passkey_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Passkey_userId_idx" ON public."Passkey" USING btree ("userId");


--
-- Name: RecoveryQuestion_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RecoveryQuestion_userId_idx" ON public."RecoveryQuestion" USING btree ("userId");


--
-- Name: Section_wardrobeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Section_wardrobeId_idx" ON public."Section" USING btree ("wardrobeId");


--
-- Name: Session_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Session_token_key" ON public."Session" USING btree (token);


--
-- Name: Session_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_userId_idx" ON public."Session" USING btree ("userId");


--
-- Name: Sticker_wardrobeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Sticker_wardrobeId_idx" ON public."Sticker" USING btree ("wardrobeId");


--
-- Name: User_handle_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_handle_key" ON public."User" USING btree (handle);


--
-- Name: User_lookupHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_lookupHash_key" ON public."User" USING btree ("lookupHash");


--
-- Name: Wardrobe_ownerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Wardrobe_ownerId_idx" ON public."Wardrobe" USING btree ("ownerId");


--
-- Name: Wardrobe_shareCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Wardrobe_shareCode_key" ON public."Wardrobe" USING btree ("shareCode");


--
-- Name: WebAuthnChallenge_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WebAuthnChallenge_userId_idx" ON public."WebAuthnChallenge" USING btree ("userId");


--
-- Name: Item Item_sectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Item"
    ADD CONSTRAINT "Item_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public."Section"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Item Item_wardrobeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Item"
    ADD CONSTRAINT "Item_wardrobeId_fkey" FOREIGN KEY ("wardrobeId") REFERENCES public."Wardrobe"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Passkey Passkey_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Passkey"
    ADD CONSTRAINT "Passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RecoveryQuestion RecoveryQuestion_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecoveryQuestion"
    ADD CONSTRAINT "RecoveryQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Section Section_wardrobeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Section"
    ADD CONSTRAINT "Section_wardrobeId_fkey" FOREIGN KEY ("wardrobeId") REFERENCES public."Wardrobe"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Sticker Sticker_wardrobeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sticker"
    ADD CONSTRAINT "Sticker_wardrobeId_fkey" FOREIGN KEY ("wardrobeId") REFERENCES public."Wardrobe"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Wardrobe Wardrobe_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Wardrobe"
    ADD CONSTRAINT "Wardrobe_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WebAuthnChallenge WebAuthnChallenge_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WebAuthnChallenge"
    ADD CONSTRAINT "WebAuthnChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict BhTdEYZYmG4njbASpA5w1EZZQddlHgl0FomIoYvtbiR1urkiAQdzpiEUEr07IR5

