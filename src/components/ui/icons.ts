import {
	Activity,
	ArrowLeft,
	ArrowRight,
	BookOpen,
	ChevronDown,
	Coins,
	Eye,
	Image,
	Info,
	Mail,
	Menu,
	Moon,
	Palette,
	Pin,
	Search,
	Sun,
	TrainFront,
	Users,
} from 'lucide-static';
import {
	siBilibili,
	siBun,
	siCplusplus,
	siDocker,
	siDotnet,
	siFsharp,
	siGithub,
	siGo,
	siHtml5,
	siJavascript,
	siMariadb,
	siMysql,
	siNodedotjs,
	siOpenjdk,
	siPhp,
	siPostgresql,
	siPython,
	siRedis,
	siRss,
	siRust,
	siTypescript,
	siVuedotjs,
	siVuetify,
} from 'simple-icons';
import type { SimpleIcon } from 'simple-icons';

export interface IconData {
	body: string;
	color?: string;
	label?: string;
}

const line = (svg: string): IconData => ({
	body: svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim(),
});

const brand = (icon: SimpleIcon): IconData => ({
	body: `<path fill="currentColor" stroke="none" d="${icon.path}"/>`,
	color: `#${icon.hex}`,
	label: icon.title,
});

export const ICONS: Record<string, IconData> = {
	activity: line(Activity),
	'arrow-left': line(ArrowLeft),
	'arrow-right': line(ArrowRight),
	'book-open': line(BookOpen),
	'chevron-down': line(ChevronDown),
	coins: line(Coins),
	eye: line(Eye),
	image: line(Image),
	info: line(Info),
	mail: line(Mail),
	menu: line(Menu),
	moon: line(Moon),
	palette: line(Palette),
	pin: line(Pin),
	search: line(Search),
	sun: line(Sun),
	'train-front': line(TrainFront),
	users: line(Users),

	github: brand(siGithub),
	rss: brand(siRss),
	bilibili: brand(siBilibili),

	typescript: brand(siTypescript),
	dotnet: brand(siDotnet),
	fsharp: brand(siFsharp),
	python: brand(siPython),
	php: brand(siPhp),
	javascript: brand(siJavascript),
	java: brand(siOpenjdk),
	vue: brand(siVuedotjs),
	nodejs: brand(siNodedotjs),
	html5: brand(siHtml5),
	bun: brand(siBun),
	go: brand(siGo),
	rust: brand(siRust),
	vuetify: brand(siVuetify),
	docker: brand(siDocker),
	cplusplus: brand(siCplusplus),
	postgresql: brand(siPostgresql),
	mysql: brand(siMysql),
	mariadb: brand(siMariadb),
	redis: brand(siRedis),
};
