export interface Province {
  id: string
  name: string
}

export const NEPAL_DATA: {
  provinces: Province[]
  districts: Record<string, string[]>
} = {
  provinces: [
    { id: '1', name: 'Province No. 1 (Koshi)' },
    { id: '2', name: 'Province No. 2 (Madhesh)' },
    { id: '3', name: 'Bagmati Province' },
    { id: '4', name: 'Gandaki Province' },
    { id: '5', name: 'Lumbini Province' },
    { id: '6', name: 'Karnali Province' },
    { id: '7', name: 'Sudurpashchim Province' },
  ],
  districts: {
    '1': ['Bhojpur', 'Dhankuta', 'Ilam', 'Jhapa', 'Khotang', 'Morang', 'Okhaldhunga', 'Panchthar', 'Sankhuwasabha', 'Solukhumbu', 'Sunsari', 'Taplejung', 'Terhathum', 'Udayapur'],
    '2': ['Bara', 'Dhanusha', 'Mahottari', 'Parsa', 'Rautahat', 'Saptari', 'Sarlahi', 'Siraha'],
    '3': ['Bhaktapur', 'Chitwan', 'Dhading', 'Dolakha', 'Kathmandu', 'Kavrepalanchok', 'Lalitpur', 'Makwanpur', 'Nuwakot', 'Ramechhap', 'Rasuwa', 'Sindhuli', 'Sindhupalchok'],
    '4': ['Baglung', 'Gorkha', 'Kaski', 'Lamjung', 'Manang', 'Mustang', 'Myagdi', 'Nawalpur', 'Parbat', 'Syangja', 'Tanahun'],
    '5': ['Arghakhanchi', 'Banke', 'Bardiya', 'Dang', 'Eastern Rukum', 'Gulmi', 'Kapilvastu', 'Nawalparasi West', 'Palpa', 'Pyuthan', 'Rolpa', 'Rupandehi'],
    '6': ['Dailekh', 'Dolpa', 'Humla', 'Jajarkot', 'Jumla', 'Kalikot', 'Mugu', 'Salyan', 'Surkhet', 'Western Rukum'],
    '7': ['Achham', 'Baitadi', 'Bajhang', 'Bajura', 'Dadeldhura', 'Darchula', 'Doti', 'Kailali', 'Kanchanpur'],
  },
}

export const provinces = NEPAL_DATA.provinces

export const getDistricts = (provinceName: string): string[] => {
  const id = provinces.find((prov) => prov.name === provinceName)?.id || ''
  return NEPAL_DATA.districts[id] || []
}
