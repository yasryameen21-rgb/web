export type ArabCountry = {
  code: string;
  name: string;
  dialCode: string;
};

export const arabCountries: ArabCountry[] = [
  { code: "SA", name: "السعودية", dialCode: "966" },
  { code: "AE", name: "الإمارات", dialCode: "971" },
  { code: "EG", name: "مصر", dialCode: "20" },
  { code: "JO", name: "الأردن", dialCode: "962" },
  { code: "KW", name: "الكويت", dialCode: "965" },
  { code: "QA", name: "قطر", dialCode: "974" },
  { code: "BH", name: "البحرين", dialCode: "973" },
  { code: "OM", name: "عُمان", dialCode: "968" },
  { code: "IQ", name: "العراق", dialCode: "964" },
  { code: "SY", name: "سوريا", dialCode: "963" },
  { code: "LB", name: "لبنان", dialCode: "961" },
  { code: "PS", name: "فلسطين", dialCode: "970" },
  { code: "YE", name: "اليمن", dialCode: "967" },
  { code: "SD", name: "السودان", dialCode: "249" },
  { code: "LY", name: "ليبيا", dialCode: "218" },
  { code: "TN", name: "تونس", dialCode: "216" },
  { code: "DZ", name: "الجزائر", dialCode: "213" },
  { code: "MA", name: "المغرب", dialCode: "212" },
  { code: "MR", name: "موريتانيا", dialCode: "222" },
  { code: "DJ", name: "جيبوتي", dialCode: "253" },
  { code: "KM", name: "جزر القمر", dialCode: "269" },
  { code: "SO", name: "الصومال", dialCode: "252" },
];

export const DEFAULT_ARAB_COUNTRY = arabCountries[0];

export function stripPhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function buildFullPhoneNumber(countryCode: string, localPhone: string) {
  return `${stripPhoneDigits(countryCode)}${stripPhoneDigits(localPhone)}`;
}

export function findArabCountry(countryCode: string) {
  return arabCountries.find(country => country.code === countryCode) ?? DEFAULT_ARAB_COUNTRY;
}
