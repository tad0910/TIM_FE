
export function validateVietnamesePhoneNumber(phoneNumber: string): {
  isValid: boolean;
  error?: string;
  formattedNumber?: string;
} {
  if (!phoneNumber) {
    return { isValid: true };
  }

  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  const vietnamesePhoneRegex = /^(\+84|84|0)?(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-6|8|9]|9[0-4|6-9])[0-9]{7}$/;
  
  if (!vietnamesePhoneRegex.test(cleaned)) {
    return {
      isValid: false,
      error: "Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)"
    };
  }

  let formattedNumber = cleaned;
  if (cleaned.startsWith('+84')) {
    formattedNumber = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('84')) {
    formattedNumber = '0' + cleaned.substring(2);
  }

  return {
    isValid: true,
    formattedNumber
  };
}

export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return cleaned.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  }
  
  return phoneNumber;
}


export function getPhoneCarrier(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  const number = cleaned.startsWith('0') ? cleaned : '0' + cleaned.substring(2);
  
  if (number.startsWith('032') || number.startsWith('033') || number.startsWith('034') || 
      number.startsWith('035') || number.startsWith('036') || number.startsWith('037') || 
      number.startsWith('038') || number.startsWith('039')) {
    return 'Viettel';
  } else if (number.startsWith('070') || number.startsWith('076') || number.startsWith('077') || 
             number.startsWith('078') || number.startsWith('079')) {
    return 'Mobifone';
  } else if (number.startsWith('081') || number.startsWith('082') || number.startsWith('083') || 
             number.startsWith('084') || number.startsWith('085')) {
    return 'Vinaphone';
  } else if (number.startsWith('056') || number.startsWith('058')) {
    return 'Vietnamobile';
  } else if (number.startsWith('059')) {
    return 'Gmobile';
  }
  
  return 'Không xác định';
}
