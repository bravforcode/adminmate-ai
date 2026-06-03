CREATE OR REPLACE FUNCTION anonymize_candidate_data(p_email VARCHAR, p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE candidates SET full_name = 'ลบข้อมูลแล้ว', full_name_th = 'ลบข้อมูลแล้ว',
    email = CONCAT('anon_', LEFT(MD5(id::TEXT), 8), '@deleted.local'),
    phone = NULL, line_user_id = NULL, whatsapp_phone = NULL, notes = 'Data anonymized per PDPA request'
  WHERE email = p_email AND company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
