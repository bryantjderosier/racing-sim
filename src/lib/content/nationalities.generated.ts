// GENERATED FILE — do not edit by hand.
// Source: countries-list (MIT). Regenerate with `pnpm run content:nationalities`.

export type ContinentCode = 'AF' | 'AN' | 'AS' | 'EU' | 'NA' | 'OC' | 'SA';

export interface Continent {
	code: ContinentCode;
	name: string;
}

export interface NationalityRecord {
	id: string;
	code: string;
	displayName: string;
	iso2: string;
	continent: ContinentCode;
}

export const CONTINENTS: readonly Continent[] = Object.freeze([
	{ code: 'AF', name: 'Africa' },
	{ code: 'AN', name: 'Antarctica' },
	{ code: 'AS', name: 'Asia' },
	{ code: 'EU', name: 'Europe' },
	{ code: 'NA', name: 'North America' },
	{ code: 'OC', name: 'Oceania' },
	{ code: 'SA', name: 'South America' }
]);

export const NATIONALITIES: readonly NationalityRecord[] = Object.freeze([
	{
		id: '00000000-0000-4000-8000-01c8764d3629',
		code: 'afg',
		displayName: 'Afghanistan',
		iso2: 'AF',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01e59ad3b056',
		code: 'ala',
		displayName: 'Aland',
		iso2: 'AX',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-013b3f64c6c8',
		code: 'alb',
		displayName: 'Albania',
		iso2: 'AL',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-011d3dcb90d4',
		code: 'dza',
		displayName: 'Algeria',
		iso2: 'DZ',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-019afd0e0d99',
		code: 'asm',
		displayName: 'American Samoa',
		iso2: 'AS',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-016b487092db',
		code: 'and',
		displayName: 'Andorra',
		iso2: 'AD',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-01f02ac81894',
		code: 'ago',
		displayName: 'Angola',
		iso2: 'AO',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-019beb7dc823',
		code: 'aia',
		displayName: 'Anguilla',
		iso2: 'AI',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-016bc0e2fc38',
		code: 'ata',
		displayName: 'Antarctica',
		iso2: 'AQ',
		continent: 'AN'
	},
	{
		id: '00000000-0000-4000-8000-0105f3ae2f2b',
		code: 'atg',
		displayName: 'Antigua and Barbuda',
		iso2: 'AG',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-019a924718a2',
		code: 'arg',
		displayName: 'Argentina',
		iso2: 'AR',
		continent: 'SA'
	},
	{
		id: '00000000-0000-4000-8000-012abecd7406',
		code: 'arm',
		displayName: 'Armenia',
		iso2: 'AM',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-011f152d3ba6',
		code: 'abw',
		displayName: 'Aruba',
		iso2: 'AW',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-01546a0805bd',
		code: 'asc',
		displayName: 'Ascension Island',
		iso2: 'AC',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01574f76f349',
		code: 'aus',
		displayName: 'Australia',
		iso2: 'AU',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-01c97ea1e9a9',
		code: 'aut',
		displayName: 'Austria',
		iso2: 'AT',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-017a11ce47a3',
		code: 'aze',
		displayName: 'Azerbaijan',
		iso2: 'AZ',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01cda1e04909',
		code: 'bhs',
		displayName: 'Bahamas',
		iso2: 'BS',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-012bc665b08b',
		code: 'bhr',
		displayName: 'Bahrain',
		iso2: 'BH',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01f82ad65dfd',
		code: 'bgd',
		displayName: 'Bangladesh',
		iso2: 'BD',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-0173f796f0c4',
		code: 'brb',
		displayName: 'Barbados',
		iso2: 'BB',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-013b8a00911c',
		code: 'blr',
		displayName: 'Belarus',
		iso2: 'BY',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-019469f12335',
		code: 'bel',
		displayName: 'Belgium',
		iso2: 'BE',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-0132f19b5c32',
		code: 'blz',
		displayName: 'Belize',
		iso2: 'BZ',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-014c80e21512',
		code: 'ben',
		displayName: 'Benin',
		iso2: 'BJ',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01deec71f775',
		code: 'bmu',
		displayName: 'Bermuda',
		iso2: 'BM',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-01cc67ac49a5',
		code: 'btn',
		displayName: 'Bhutan',
		iso2: 'BT',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-0101a0342fa3',
		code: 'bol',
		displayName: 'Bolivia',
		iso2: 'BO',
		continent: 'SA'
	},
	{
		id: '00000000-0000-4000-8000-019295cda088',
		code: 'bes',
		displayName: 'Bonaire',
		iso2: 'BQ',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-014367ec37e9',
		code: 'bih',
		displayName: 'Bosnia and Herzegovina',
		iso2: 'BA',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-013e0cfb423f',
		code: 'bwa',
		displayName: 'Botswana',
		iso2: 'BW',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-012df6c6b104',
		code: 'bvt',
		displayName: 'Bouvet Island',
		iso2: 'BV',
		continent: 'AN'
	},
	{
		id: '00000000-0000-4000-8000-017b5cf72813',
		code: 'bra',
		displayName: 'Brazil',
		iso2: 'BR',
		continent: 'SA'
	},
	{
		id: '00000000-0000-4000-8000-01aaeb1974ff',
		code: 'iot',
		displayName: 'British Indian Ocean Territory',
		iso2: 'IO',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-017203d8a2d0',
		code: 'vgb',
		displayName: 'British Virgin Islands',
		iso2: 'VG',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-012482c0ca16',
		code: 'brn',
		displayName: 'Brunei',
		iso2: 'BN',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-0166c24a9d4a',
		code: 'bgr',
		displayName: 'Bulgaria',
		iso2: 'BG',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-011b6338054c',
		code: 'bfa',
		displayName: 'Burkina Faso',
		iso2: 'BF',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-013600013094',
		code: 'bdi',
		displayName: 'Burundi',
		iso2: 'BI',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-012b06a79d0c',
		code: 'cpv',
		displayName: 'Cabo Verde',
		iso2: 'CV',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-017e8d3b543f',
		code: 'khm',
		displayName: 'Cambodia',
		iso2: 'KH',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01d657649b13',
		code: 'cmr',
		displayName: 'Cameroon',
		iso2: 'CM',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-0191609e7e05',
		code: 'can',
		displayName: 'Canada',
		iso2: 'CA',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-016f026f7495',
		code: 'cym',
		displayName: 'Cayman Islands',
		iso2: 'KY',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-018c22fbd382',
		code: 'caf',
		displayName: 'Central African Republic',
		iso2: 'CF',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-0120eb23ecb9',
		code: 'tcd',
		displayName: 'Chad',
		iso2: 'TD',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01756e1c4315',
		code: 'chl',
		displayName: 'Chile',
		iso2: 'CL',
		continent: 'SA'
	},
	{
		id: '00000000-0000-4000-8000-0107e7c72b20',
		code: 'chn',
		displayName: 'China',
		iso2: 'CN',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01285365b0bc',
		code: 'cxr',
		displayName: 'Christmas Island',
		iso2: 'CX',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-0134f5eb990d',
		code: 'cck',
		displayName: 'Cocos (Keeling) Islands',
		iso2: 'CC',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-016109492c89',
		code: 'col',
		displayName: 'Colombia',
		iso2: 'CO',
		continent: 'SA'
	},
	{
		id: '00000000-0000-4000-8000-01a496e21993',
		code: 'com',
		displayName: 'Comoros',
		iso2: 'KM',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01ef8d4f0abe',
		code: 'cok',
		displayName: 'Cook Islands',
		iso2: 'CK',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-0158c6747f68',
		code: 'cri',
		displayName: 'Costa Rica',
		iso2: 'CR',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-0164238daecf',
		code: 'hrv',
		displayName: 'Croatia',
		iso2: 'HR',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-018765995be2',
		code: 'cub',
		displayName: 'Cuba',
		iso2: 'CU',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-0132676aefca',
		code: 'cuw',
		displayName: 'Curacao',
		iso2: 'CW',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-012f391cb4d8',
		code: 'cyp',
		displayName: 'Cyprus',
		iso2: 'CY',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-0155e189c7a8',
		code: 'cze',
		displayName: 'Czechia',
		iso2: 'CZ',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-01861c84454c',
		code: 'cod',
		displayName: 'Democratic Republic of the Congo',
		iso2: 'CD',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-014c0fe4d3bd',
		code: 'dnk',
		displayName: 'Denmark',
		iso2: 'DK',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-016cec101b2e',
		code: 'dji',
		displayName: 'Djibouti',
		iso2: 'DJ',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01b30686a18b',
		code: 'dma',
		displayName: 'Dominica',
		iso2: 'DM',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-01013523a66f',
		code: 'dom',
		displayName: 'Dominican Republic',
		iso2: 'DO',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-014efa6cb486',
		code: 'tls',
		displayName: 'East Timor',
		iso2: 'TL',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-019e67b6fde2',
		code: 'ecu',
		displayName: 'Ecuador',
		iso2: 'EC',
		continent: 'SA'
	},
	{
		id: '00000000-0000-4000-8000-01175cd99ee4',
		code: 'egy',
		displayName: 'Egypt',
		iso2: 'EG',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01911b0ebb61',
		code: 'slv',
		displayName: 'El Salvador',
		iso2: 'SV',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-011a23113f62',
		code: 'gnq',
		displayName: 'Equatorial Guinea',
		iso2: 'GQ',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-0176c8fc973b',
		code: 'eri',
		displayName: 'Eritrea',
		iso2: 'ER',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01646304e0de',
		code: 'est',
		displayName: 'Estonia',
		iso2: 'EE',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-016c265b553f',
		code: 'swz',
		displayName: 'Eswatini',
		iso2: 'SZ',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-0191312a9078',
		code: 'eth',
		displayName: 'Ethiopia',
		iso2: 'ET',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-0152c3c653d3',
		code: 'flk',
		displayName: 'Falkland Islands',
		iso2: 'FK',
		continent: 'SA'
	},
	{
		id: '00000000-0000-4000-8000-01b41ef3c035',
		code: 'fro',
		displayName: 'Faroe Islands',
		iso2: 'FO',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-017bd0b352aa',
		code: 'fji',
		displayName: 'Fiji',
		iso2: 'FJ',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-019cd4f0805c',
		code: 'fin',
		displayName: 'Finland',
		iso2: 'FI',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-01c2add16496',
		code: 'fra',
		displayName: 'France',
		iso2: 'FR',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-01ba2ade05b8',
		code: 'guf',
		displayName: 'French Guiana',
		iso2: 'GF',
		continent: 'SA'
	},
	{
		id: '00000000-0000-4000-8000-01f46d5849b9',
		code: 'pyf',
		displayName: 'French Polynesia',
		iso2: 'PF',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-01b42c04a810',
		code: 'atf',
		displayName: 'French Southern Territories',
		iso2: 'TF',
		continent: 'AN'
	},
	{
		id: '00000000-0000-4000-8000-01e44f3e80f8',
		code: 'gab',
		displayName: 'Gabon',
		iso2: 'GA',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01cac1bfb41c',
		code: 'gmb',
		displayName: 'Gambia',
		iso2: 'GM',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-0188c158fdec',
		code: 'geo',
		displayName: 'Georgia',
		iso2: 'GE',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-0155f51b0630',
		code: 'deu',
		displayName: 'Germany',
		iso2: 'DE',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-01c731272ab8',
		code: 'gha',
		displayName: 'Ghana',
		iso2: 'GH',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-012107eac6be',
		code: 'gib',
		displayName: 'Gibraltar',
		iso2: 'GI',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-010727ba3d27',
		code: 'grc',
		displayName: 'Greece',
		iso2: 'GR',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-017500f16d84',
		code: 'grl',
		displayName: 'Greenland',
		iso2: 'GL',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-015675a50344',
		code: 'grd',
		displayName: 'Grenada',
		iso2: 'GD',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-01cd9a8305d7',
		code: 'glp',
		displayName: 'Guadeloupe',
		iso2: 'GP',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-01034cf49aa5',
		code: 'gum',
		displayName: 'Guam',
		iso2: 'GU',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-01d558e4a327',
		code: 'gtm',
		displayName: 'Guatemala',
		iso2: 'GT',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-01183b75a3dc',
		code: 'ggy',
		displayName: 'Guernsey',
		iso2: 'GG',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-012d14e48f7b',
		code: 'gin',
		displayName: 'Guinea',
		iso2: 'GN',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-0144707c001b',
		code: 'gnb',
		displayName: 'Guinea-Bissau',
		iso2: 'GW',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-017f5d82c2aa',
		code: 'guy',
		displayName: 'Guyana',
		iso2: 'GY',
		continent: 'SA'
	},
	{
		id: '00000000-0000-4000-8000-013e735904ae',
		code: 'hti',
		displayName: 'Haiti',
		iso2: 'HT',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-01cc66e6016b',
		code: 'hmd',
		displayName: 'Heard Island and McDonald Islands',
		iso2: 'HM',
		continent: 'AN'
	},
	{
		id: '00000000-0000-4000-8000-01292f3a0bf0',
		code: 'hnd',
		displayName: 'Honduras',
		iso2: 'HN',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-01f7469df732',
		code: 'hkg',
		displayName: 'Hong Kong',
		iso2: 'HK',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01a7f35f1b39',
		code: 'hun',
		displayName: 'Hungary',
		iso2: 'HU',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-01762a23d9ee',
		code: 'isl',
		displayName: 'Iceland',
		iso2: 'IS',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-012b6f5b8868',
		code: 'ind',
		displayName: 'India',
		iso2: 'IN',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-0147b93e8bd2',
		code: 'idn',
		displayName: 'Indonesia',
		iso2: 'ID',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01a6e589cd27',
		code: 'irn',
		displayName: 'Iran',
		iso2: 'IR',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-015b1be99d82',
		code: 'irq',
		displayName: 'Iraq',
		iso2: 'IQ',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01f6aacea0a4',
		code: 'irl',
		displayName: 'Ireland',
		iso2: 'IE',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-010114d0f840',
		code: 'imn',
		displayName: 'Isle of Man',
		iso2: 'IM',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-0140c3cc26e6',
		code: 'isr',
		displayName: 'Israel',
		iso2: 'IL',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-016f2a108b94',
		code: 'ita',
		displayName: 'Italy',
		iso2: 'IT',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-01e6f1c25f91',
		code: 'civ',
		displayName: 'Ivory Coast',
		iso2: 'CI',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01960da249ff',
		code: 'jam',
		displayName: 'Jamaica',
		iso2: 'JM',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-014314c8d317',
		code: 'jpn',
		displayName: 'Japan',
		iso2: 'JP',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-0176e808b333',
		code: 'jey',
		displayName: 'Jersey',
		iso2: 'JE',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-01ab136ef7c1',
		code: 'jor',
		displayName: 'Jordan',
		iso2: 'JO',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01f030eefbdf',
		code: 'kaz',
		displayName: 'Kazakhstan',
		iso2: 'KZ',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-019d08ee1a31',
		code: 'ken',
		displayName: 'Kenya',
		iso2: 'KE',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-012390aede13',
		code: 'kir',
		displayName: 'Kiribati',
		iso2: 'KI',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-01a282d07f50',
		code: 'xkx',
		displayName: 'Kosovo',
		iso2: 'XK',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-01a788869b28',
		code: 'kwt',
		displayName: 'Kuwait',
		iso2: 'KW',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01eafa08d9b8',
		code: 'kgz',
		displayName: 'Kyrgyzstan',
		iso2: 'KG',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-017268c80f86',
		code: 'lao',
		displayName: 'Laos',
		iso2: 'LA',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01f04b838800',
		code: 'lva',
		displayName: 'Latvia',
		iso2: 'LV',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-0138dcb8233c',
		code: 'lbn',
		displayName: 'Lebanon',
		iso2: 'LB',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01b795df7ee3',
		code: 'lso',
		displayName: 'Lesotho',
		iso2: 'LS',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-018f88ee6906',
		code: 'lbr',
		displayName: 'Liberia',
		iso2: 'LR',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01b66e6f6066',
		code: 'lby',
		displayName: 'Libya',
		iso2: 'LY',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-0153353244bd',
		code: 'lie',
		displayName: 'Liechtenstein',
		iso2: 'LI',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-016350a3585b',
		code: 'ltu',
		displayName: 'Lithuania',
		iso2: 'LT',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-01982a6b24cc',
		code: 'lux',
		displayName: 'Luxembourg',
		iso2: 'LU',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-01df13ef72d1',
		code: 'mac',
		displayName: 'Macao',
		iso2: 'MO',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01ae7053a108',
		code: 'mdg',
		displayName: 'Madagascar',
		iso2: 'MG',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-013bb0abd160',
		code: 'mwi',
		displayName: 'Malawi',
		iso2: 'MW',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01314c62a581',
		code: 'mys',
		displayName: 'Malaysia',
		iso2: 'MY',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01d1ed2dc26e',
		code: 'mdv',
		displayName: 'Maldives',
		iso2: 'MV',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-0134be31ab43',
		code: 'mli',
		displayName: 'Mali',
		iso2: 'ML',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01ce98aa7b95',
		code: 'mlt',
		displayName: 'Malta',
		iso2: 'MT',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-017828809d03',
		code: 'mhl',
		displayName: 'Marshall Islands',
		iso2: 'MH',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-01db5a137f2e',
		code: 'mtq',
		displayName: 'Martinique',
		iso2: 'MQ',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-0188ff6db864',
		code: 'mrt',
		displayName: 'Mauritania',
		iso2: 'MR',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-011a2ec45251',
		code: 'mus',
		displayName: 'Mauritius',
		iso2: 'MU',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-011c641e12ef',
		code: 'myt',
		displayName: 'Mayotte',
		iso2: 'YT',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-016e67a2ba20',
		code: 'mex',
		displayName: 'Mexico',
		iso2: 'MX',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-015ef296625d',
		code: 'fsm',
		displayName: 'Micronesia',
		iso2: 'FM',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-01a84daebbe5',
		code: 'mda',
		displayName: 'Moldova',
		iso2: 'MD',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-019a0f9ae64c',
		code: 'mco',
		displayName: 'Monaco',
		iso2: 'MC',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-015b0b96dff5',
		code: 'mng',
		displayName: 'Mongolia',
		iso2: 'MN',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-019524a18118',
		code: 'mne',
		displayName: 'Montenegro',
		iso2: 'ME',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-01a0eefe547d',
		code: 'msr',
		displayName: 'Montserrat',
		iso2: 'MS',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-01bc209c1c79',
		code: 'mar',
		displayName: 'Morocco',
		iso2: 'MA',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01ade709cf93',
		code: 'moz',
		displayName: 'Mozambique',
		iso2: 'MZ',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-014234b78636',
		code: 'mmr',
		displayName: 'Myanmar',
		iso2: 'MM',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01ab04e25791',
		code: 'nam',
		displayName: 'Namibia',
		iso2: 'NA',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01d6bc426326',
		code: 'nru',
		displayName: 'Nauru',
		iso2: 'NR',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-01c4af8f8838',
		code: 'npl',
		displayName: 'Nepal',
		iso2: 'NP',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01d8ac767bd4',
		code: 'nld',
		displayName: 'Netherlands',
		iso2: 'NL',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-014534e63b87',
		code: 'ncl',
		displayName: 'New Caledonia',
		iso2: 'NC',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-012d31a66c47',
		code: 'nzl',
		displayName: 'New Zealand',
		iso2: 'NZ',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-01edf2a9eb68',
		code: 'nic',
		displayName: 'Nicaragua',
		iso2: 'NI',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-01508e45e157',
		code: 'ner',
		displayName: 'Niger',
		iso2: 'NE',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-0163d3338409',
		code: 'nga',
		displayName: 'Nigeria',
		iso2: 'NG',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01cfeb4957a6',
		code: 'niu',
		displayName: 'Niue',
		iso2: 'NU',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-010a3af4184e',
		code: 'nfk',
		displayName: 'Norfolk Island',
		iso2: 'NF',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-01c5780edeb1',
		code: 'prk',
		displayName: 'North Korea',
		iso2: 'KP',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01dd34273ad2',
		code: 'mkd',
		displayName: 'North Macedonia',
		iso2: 'MK',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-01e66b80248e',
		code: 'mnp',
		displayName: 'Northern Mariana Islands',
		iso2: 'MP',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-018a973084fc',
		code: 'nor',
		displayName: 'Norway',
		iso2: 'NO',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-0139a7271c83',
		code: 'omn',
		displayName: 'Oman',
		iso2: 'OM',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01797d7bac9f',
		code: 'pak',
		displayName: 'Pakistan',
		iso2: 'PK',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-0153ac9a5c9b',
		code: 'plw',
		displayName: 'Palau',
		iso2: 'PW',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-013e73b5fae7',
		code: 'pse',
		displayName: 'Palestine',
		iso2: 'PS',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01ec437beafb',
		code: 'pan',
		displayName: 'Panama',
		iso2: 'PA',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-0199b3c2a75a',
		code: 'png',
		displayName: 'Papua New Guinea',
		iso2: 'PG',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-018c43573206',
		code: 'pry',
		displayName: 'Paraguay',
		iso2: 'PY',
		continent: 'SA'
	},
	{
		id: '00000000-0000-4000-8000-01c5130be1f7',
		code: 'per',
		displayName: 'Peru',
		iso2: 'PE',
		continent: 'SA'
	},
	{
		id: '00000000-0000-4000-8000-01bb60a41f6d',
		code: 'phl',
		displayName: 'Philippines',
		iso2: 'PH',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-0187076c9d2a',
		code: 'pcn',
		displayName: 'Pitcairn Islands',
		iso2: 'PN',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-012bbb57c21e',
		code: 'pol',
		displayName: 'Poland',
		iso2: 'PL',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-0174e4d24570',
		code: 'prt',
		displayName: 'Portugal',
		iso2: 'PT',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-013fe07c63f5',
		code: 'pri',
		displayName: 'Puerto Rico',
		iso2: 'PR',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-017f99ee7c15',
		code: 'qat',
		displayName: 'Qatar',
		iso2: 'QA',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01f703d7ee19',
		code: 'cog',
		displayName: 'Republic of the Congo',
		iso2: 'CG',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01a345f7ee24',
		code: 'reu',
		displayName: 'Reunion',
		iso2: 'RE',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01e18823a767',
		code: 'rou',
		displayName: 'Romania',
		iso2: 'RO',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-01ca2e7217d5',
		code: 'rus',
		displayName: 'Russia',
		iso2: 'RU',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-018e568e3338',
		code: 'rwa',
		displayName: 'Rwanda',
		iso2: 'RW',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-016d6958b92c',
		code: 'blm',
		displayName: 'Saint Barthelemy',
		iso2: 'BL',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-0105397e3389',
		code: 'shn',
		displayName: 'Saint Helena',
		iso2: 'SH',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-015cb345c3c4',
		code: 'kna',
		displayName: 'Saint Kitts and Nevis',
		iso2: 'KN',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-01849f4c7d71',
		code: 'lca',
		displayName: 'Saint Lucia',
		iso2: 'LC',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-01a60caccdfc',
		code: 'maf',
		displayName: 'Saint Martin',
		iso2: 'MF',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-01c810daa7a3',
		code: 'spm',
		displayName: 'Saint Pierre and Miquelon',
		iso2: 'PM',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-017b274085b5',
		code: 'vct',
		displayName: 'Saint Vincent and the Grenadines',
		iso2: 'VC',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-01f97002fa6a',
		code: 'wsm',
		displayName: 'Samoa',
		iso2: 'WS',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-01ec15b0e6af',
		code: 'smr',
		displayName: 'San Marino',
		iso2: 'SM',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-0113a14fe891',
		code: 'stp',
		displayName: 'Sao Tome and Principe',
		iso2: 'ST',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01ea4fd19cea',
		code: 'sau',
		displayName: 'Saudi Arabia',
		iso2: 'SA',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01a77d1abbdd',
		code: 'sen',
		displayName: 'Senegal',
		iso2: 'SN',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-012a188fa24d',
		code: 'srb',
		displayName: 'Serbia',
		iso2: 'RS',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-0186922218ac',
		code: 'syc',
		displayName: 'Seychelles',
		iso2: 'SC',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-0190a1727af7',
		code: 'sle',
		displayName: 'Sierra Leone',
		iso2: 'SL',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-010673710fc3',
		code: 'sgp',
		displayName: 'Singapore',
		iso2: 'SG',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-0147393bbe10',
		code: 'sxm',
		displayName: 'Sint Maarten',
		iso2: 'SX',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-01d841277d56',
		code: 'svk',
		displayName: 'Slovakia',
		iso2: 'SK',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-011ee122b77e',
		code: 'svn',
		displayName: 'Slovenia',
		iso2: 'SI',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-01898b0fc588',
		code: 'slb',
		displayName: 'Solomon Islands',
		iso2: 'SB',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-017439e19c5d',
		code: 'som',
		displayName: 'Somalia',
		iso2: 'SO',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01dfa1858e5c',
		code: 'zaf',
		displayName: 'South Africa',
		iso2: 'ZA',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01b1586b95ef',
		code: 'sgs',
		displayName: 'South Georgia and the South Sandwich Islands',
		iso2: 'GS',
		continent: 'AN'
	},
	{
		id: '00000000-0000-4000-8000-015556b26a06',
		code: 'kor',
		displayName: 'South Korea',
		iso2: 'KR',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01787c0a65bf',
		code: 'ssd',
		displayName: 'South Sudan',
		iso2: 'SS',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-0169d3cb2a4f',
		code: 'esp',
		displayName: 'Spain',
		iso2: 'ES',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-018e3767aa26',
		code: 'lka',
		displayName: 'Sri Lanka',
		iso2: 'LK',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-012637f5771a',
		code: 'sdn',
		displayName: 'Sudan',
		iso2: 'SD',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01e89aa3f2ce',
		code: 'sur',
		displayName: 'Suriname',
		iso2: 'SR',
		continent: 'SA'
	},
	{
		id: '00000000-0000-4000-8000-0121dc2bfe15',
		code: 'sjm',
		displayName: 'Svalbard and Jan Mayen',
		iso2: 'SJ',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-013eeaf35d20',
		code: 'swe',
		displayName: 'Sweden',
		iso2: 'SE',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-01f9de76f8ad',
		code: 'che',
		displayName: 'Switzerland',
		iso2: 'CH',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-01fe11ac375f',
		code: 'syr',
		displayName: 'Syria',
		iso2: 'SY',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-012629c93daa',
		code: 'twn',
		displayName: 'Taiwan',
		iso2: 'TW',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01eb0fa13fcf',
		code: 'tjk',
		displayName: 'Tajikistan',
		iso2: 'TJ',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01b42525647e',
		code: 'tza',
		displayName: 'Tanzania',
		iso2: 'TZ',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-014eb055356e',
		code: 'tha',
		displayName: 'Thailand',
		iso2: 'TH',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01ef76f14c31',
		code: 'tgo',
		displayName: 'Togo',
		iso2: 'TG',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01661580c7c5',
		code: 'tkl',
		displayName: 'Tokelau',
		iso2: 'TK',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-01e28069b88a',
		code: 'ton',
		displayName: 'Tonga',
		iso2: 'TO',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-012256ac412d',
		code: 'tto',
		displayName: 'Trinidad and Tobago',
		iso2: 'TT',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-0181b90f9f8d',
		code: 'taa',
		displayName: 'Tristan da Cunha',
		iso2: 'TA',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-01c30299f35d',
		code: 'tun',
		displayName: 'Tunisia',
		iso2: 'TN',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-011322a57c7b',
		code: 'tur',
		displayName: 'Türkiye',
		iso2: 'TR',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-017cccb36f86',
		code: 'tkm',
		displayName: 'Turkmenistan',
		iso2: 'TM',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-01a3e506f2ad',
		code: 'tca',
		displayName: 'Turks and Caicos Islands',
		iso2: 'TC',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-014b4201948d',
		code: 'tuv',
		displayName: 'Tuvalu',
		iso2: 'TV',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-0163ace105a7',
		code: 'umi',
		displayName: 'U.S. Minor Outlying Islands',
		iso2: 'UM',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-0108621a730b',
		code: 'vir',
		displayName: 'U.S. Virgin Islands',
		iso2: 'VI',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-01cb131ea0b0',
		code: 'uga',
		displayName: 'Uganda',
		iso2: 'UG',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-017c5d7ebd5e',
		code: 'ukr',
		displayName: 'Ukraine',
		iso2: 'UA',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-012d5aa9a906',
		code: 'are',
		displayName: 'United Arab Emirates',
		iso2: 'AE',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-019acaf8315d',
		code: 'gbr',
		displayName: 'United Kingdom',
		iso2: 'GB',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-01cc0319cbc3',
		code: 'usa',
		displayName: 'United States',
		iso2: 'US',
		continent: 'NA'
	},
	{
		id: '00000000-0000-4000-8000-01fcf5910594',
		code: 'ury',
		displayName: 'Uruguay',
		iso2: 'UY',
		continent: 'SA'
	},
	{
		id: '00000000-0000-4000-8000-01ba94563748',
		code: 'uzb',
		displayName: 'Uzbekistan',
		iso2: 'UZ',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-016cd672225d',
		code: 'vut',
		displayName: 'Vanuatu',
		iso2: 'VU',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-011a34305df8',
		code: 'vat',
		displayName: 'Vatican City',
		iso2: 'VA',
		continent: 'EU'
	},
	{
		id: '00000000-0000-4000-8000-019cd212f2ef',
		code: 'ven',
		displayName: 'Venezuela',
		iso2: 'VE',
		continent: 'SA'
	},
	{
		id: '00000000-0000-4000-8000-01ce40def083',
		code: 'vnm',
		displayName: 'Vietnam',
		iso2: 'VN',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-011000e06442',
		code: 'wlf',
		displayName: 'Wallis and Futuna',
		iso2: 'WF',
		continent: 'OC'
	},
	{
		id: '00000000-0000-4000-8000-01d90d84d601',
		code: 'esh',
		displayName: 'Western Sahara',
		iso2: 'EH',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-015aaf79556e',
		code: 'yem',
		displayName: 'Yemen',
		iso2: 'YE',
		continent: 'AS'
	},
	{
		id: '00000000-0000-4000-8000-0195974199d1',
		code: 'zmb',
		displayName: 'Zambia',
		iso2: 'ZM',
		continent: 'AF'
	},
	{
		id: '00000000-0000-4000-8000-015ea2f5185b',
		code: 'zwe',
		displayName: 'Zimbabwe',
		iso2: 'ZW',
		continent: 'AF'
	}
]);
