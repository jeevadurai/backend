import { PrismaClient } from '@prisma/client';
import { upload } from '../../config/multer.js';

const prisma = new PrismaClient();

export const saveScholasticDetail = async (req, res) => {
  upload.single('image_file')(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ error: 'File upload error' });
    }

    try {
      console.log('Request Body:', req.body);

      // Remove spaces from keys in the request body
      const sanitizeKey = (key) => key.trim();
      const {
        province_code,
        first_name,
        middle_name,
        last_name,
        birth_date,
        baptism_date,
        confirmation_date,
        first_profession_date,
        final_profession_date,
        ordination_date,
        personal1_isd,
        personal1_contact_no,
        personal2_isd,
        personal2_contact_no,
        personal3_isd,
        personal3_contact_no,
        watsup1_isd,
        watsup1_no,
        watsup2_isd,
        watsup2_no,
        watsup3_isd,
        watsup3_no,
        emergency_isd,
        emergency_contact_no,
        personal_mailid1,
        blood_group_code,
        nationality_code,
        language_code = 'en', // Set default value for language_code
        concurrency_val = 1, // Set default value for concurrency_val
        created_by,
        created_date,
        updated_by,
        updated_date
      } = Object.fromEntries(
        Object.entries(req.body).map(([key, value]) => [sanitizeKey(key), value])
      );

      // Validate required fields
      if (!first_name || !last_name || !birth_date || !personal_mailid1) {
        return res.status(400).json({ error: 'Required fields are missing.' });
      }

      // Validate province_code without requiring country_code
      const provinceExists = await prisma.province_mst.findFirst({
        where: { province_code }
      });

      if (!provinceExists) {
        return res.status(400).json({ error: 'Invalid province_code.' });
      }

      // Convert date formats
      const parseDate = (dateStr) => {
        const parts = dateStr.split('.');
        if (parts.length === 3) {
          return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
        return new Date(dateStr);
      };

      const parsedBirthDate = parseDate(birth_date);
      if (isNaN(parsedBirthDate.getTime())) {
        return res.status(400).json({ error: 'Invalid birth_date format.' });
      }

      const parsedBaptismDate = baptism_date ? parseDate(baptism_date) : null;
      const parsedConfirmationDate = confirmation_date ? parseDate(confirmation_date) : null;
      const parsedFirstProfessionDate = parseDate(first_profession_date);
      const parsedFinalProfessionDate = parseDate(final_profession_date);
      const parsedOrdinationDate = ordination_date ? parseDate(ordination_date) : null;

      // Generate scholastic_code with auto-increment logic
      const lastRecord = await prisma.scholastics_dtl.findFirst({
        orderBy: { scholastic_code: 'desc' }
      });

      let scholastic_code = 'SCH001'; // Default value if there are no records

      if (lastRecord) {
        const lastCode = parseInt(lastRecord.scholastic_code.replace('SCH', ''), 10);
        scholastic_code = `SCH${String(lastCode + 1).padStart(3, '0')}`;
      }

      // Save the file details if uploaded
      const image_file_name = req.file ? req.file.filename : null;
      const image_file_path = req.file ? req.file.path : null;

      // Set the current date if created_date is not provided
      const finalCreatedDate = created_date ? new Date(created_date) : new Date();

      // Insert the data into the database
      const newScholastic = await prisma.scholastics_dtl.create({
        data: {
          scholastic_code,
          province_code,
          first_name,
          middle_name: middle_name || null,
          last_name,
          image_file_name,
          image_file_path,
          birth_date: parsedBirthDate,
          baptism_date: parsedBaptismDate,
          confirmation_date: parsedConfirmationDate,
          first_profession_date: parsedFirstProfessionDate,
          final_profession_date: parsedFinalProfessionDate,
          ordination_date: parsedOrdinationDate,
          personal1_isd: personal1_isd || null,
          personal1_contact_no: personal1_contact_no ? BigInt(personal1_contact_no) : null,
          personal2_isd: personal2_isd || null,
          personal2_contact_no: personal2_contact_no ? BigInt(personal2_contact_no) : null,
          personal3_isd: personal3_isd || null,
          personal3_contact_no: personal3_contact_no ? BigInt(personal3_contact_no) : null,
          watsup1_isd: watsup1_isd || null,
          watsup1_no: watsup1_no ? BigInt(watsup1_no) : null,
          watsup2_isd: watsup2_isd || null,
          watsup2_no: watsup2_no ? BigInt(watsup2_no) : null,
          watsup3_isd,
          watsup3_no: watsup3_no ? BigInt(watsup3_no) : null,
          emergency_isd: emergency_isd || null,
          emergency_contact_no: emergency_contact_no ? BigInt(emergency_contact_no) : null,
          personal_mailid1,
          blood_group_code: blood_group_code || null,
          nationality_code: nationality_code || null,
          language_code,
          concurrency_val,
          created_by: created_by || null,
          created_date: finalCreatedDate,
          updated_by: updated_by || null,
          updated_date: updated_date ? new Date(updated_date) : null,
        }
      });

      // Convert BigInt fields to strings before sending response
      const responseData = JSON.parse(
        JSON.stringify(newScholastic, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        )
      );

      res.status(201).json(responseData);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });
};

export const getAllScholastics = async (req, res) => {
  try {
    // Get all scholastic details
    const scholastics = await prisma.scholastics_dtl.findMany();

    if (!scholastics.length) {
      return res.status(404).json({ error: 'No scholastic records found.' });
    }

    // Convert BigInt fields to strings before sending response
    const responseData = JSON.parse(
      JSON.stringify(scholastics, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    res.status(200).json(responseData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

export const getScholasticDetailByCode = async (req, res) => {
  const { scholastic_code } = req.query;

  try {
    if (scholastic_code) {
      // Get the scholastic detail by scholastic_code using findFirst
      const scholastic = await prisma.scholastics_dtl.findFirst({
        where: { scholastic_code },
      });

      if (!scholastic) {
        return res.status(404).json({ error: 'Scholastic not found.' });
      }

      // Convert BigInt fields to strings before sending response
      const responseData = JSON.parse(
        JSON.stringify(scholastic, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        )
      );

      return res.status(200).json(responseData);
    } else {
      return res.status(400).json({ error: 'scholastic_code is required.' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};


export const deleteScholasticByCode = async (req, res) => {
  const { scholastic_code } = req.params;

  try {
    // Validate that the scholastic_code is provided
    if (!scholastic_code) {
      return res.status(400).json({ error: 'scholastic_code is required.' });
    }

    // Find the record by scholastic_code
    const scholastic = await prisma.scholastics_dtl.findFirst({
      where: { scholastic_code },
    });

    if (!scholastic) {
      return res.status(404).json({ error: 'Scholastic not found.' });
    }

    // Delete the found record
    const deletedScholastic = await prisma.scholastics_dtl.delete({
      where: {
        scholastic_code_province_code: {
          scholastic_code: scholastic.scholastic_code,
          province_code: scholastic.province_code,
        },
      },
    });

    // Convert BigInt fields to strings before sending response (if any)
    const responseData = JSON.parse(
      JSON.stringify(deletedScholastic, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    res.status(200).json({ message: 'Scholastic deleted successfully.', data: responseData });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
}



export const updateScholasticDetail = async (req, res) => {
  upload.single('image_file')(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ error: 'File upload error' });
    }

    const { scholastic_code } = req.params;

    try {
      // Validate that scholastic_code is provided
      if (!scholastic_code) {
        return res.status(400).json({ error: 'scholastic_code is required.' });
      }

      // Find the record by scholastic_code
      const scholastic = await prisma.scholastics_dtl.findFirst({
        where: { scholastic_code },
      });

      if (!scholastic) {
        return res.status(404).json({ error: 'Scholastic not found.' });
      }

      // Remove spaces from keys in the request body
      const sanitizeKey = (key) => key.trim();
      const {
        province_code,
        first_name,
        middle_name,
        last_name,
        birth_date,
        baptism_date,
        confirmation_date,
        first_profession_date,
        final_profession_date,
        ordination_date,
        personal1_isd,
        personal1_contact_no,
        personal2_isd,
        personal2_contact_no,
        personal3_isd,
        personal3_contact_no,
        watsup1_isd,
        watsup1_no,
        watsup2_isd,
        watsup2_no,
        watsup3_isd,
        watsup3_no,
        emergency_isd,
        emergency_contact_no,
        personal_mailid1,
        blood_group_code,
        nationality_code,
        language_code = 'en',
        concurrency_val = 1,
        updated_by,
        updated_date,
      } = Object.fromEntries(
        Object.entries(req.body).map(([key, value]) => [sanitizeKey(key), value])
      );

      // Truncate or validate the length of the inputs
      const truncate = (str, maxLength) => (str ? str.substring(0, maxLength) : str);

      const truncatedFirstName = truncate(first_name, 50) || scholastic.first_name;
      const truncatedMiddleName = truncate(middle_name, 50) || scholastic.middle_name;
      const truncatedLastName = truncate(last_name, 50) || scholastic.last_name;
      const truncatedPersonalMailid1 = truncate(personal_mailid1, 255) || scholastic.personal_mailid1;
      const truncatedImageFileName = req.file ? truncate(req.file.filename, 100) : scholastic.image_file_name;

      const image_file_path = req.file ? req.file.path : scholastic.image_file_path;

      // Convert date formats with validation
      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        const parts = dateStr.split('.');
        if (parts.length === 3) {
          const parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          return isNaN(parsedDate.getTime()) ? null : parsedDate;
        }
        const parsedDate = new Date(dateStr);
        return isNaN(parsedDate.getTime()) ? null : parsedDate;
      };

      const parsedBirthDate = parseDate(birth_date) || scholastic.birth_date;
      const parsedBaptismDate = parseDate(baptism_date) || scholastic.baptism_date;
      const parsedConfirmationDate = parseDate(confirmation_date) || scholastic.confirmation_date;
      const parsedFirstProfessionDate = parseDate(first_profession_date) || scholastic.first_profession_date;
      const parsedFinalProfessionDate = parseDate(final_profession_date) || scholastic.final_profession_date;
      const parsedOrdinationDate = parseDate(ordination_date) || scholastic.ordination_date;

      // Automatically set updated_date to the current date and time
      const finalUpdatedDate = updated_date ? new Date(updated_date) : new Date();

      // Update the record in the database
      const updatedScholastic = await prisma.scholastics_dtl.update({
        where: {
          scholastic_code_province_code: {
            scholastic_code: scholastic.scholastic_code,
            province_code: scholastic.province_code,
          },
        },
        data: {
          province_code: province_code || scholastic.province_code,
          first_name: truncatedFirstName,
          middle_name: truncatedMiddleName,
          last_name: truncatedLastName,
          image_file_name: truncatedImageFileName,
          image_file_path,
          birth_date: parsedBirthDate,
          baptism_date: parsedBaptismDate,
          confirmation_date: parsedConfirmationDate,
          first_profession_date: parsedFirstProfessionDate,
          final_profession_date: parsedFinalProfessionDate,
          ordination_date: parsedOrdinationDate,
          personal1_isd: personal1_isd || scholastic.personal1_isd,
          personal1_contact_no: personal1_contact_no ? BigInt(personal1_contact_no) : scholastic.personal1_contact_no,
          personal2_isd: personal2_isd || scholastic.personal2_isd,
          personal2_contact_no: personal2_contact_no ? BigInt(personal2_contact_no) : scholastic.personal2_contact_no,
          personal3_isd: personal3_isd || scholastic.personal3_isd,
          personal3_contact_no: personal3_contact_no ? BigInt(personal3_contact_no) : scholastic.personal3_contact_no,
          watsup1_isd: watsup1_isd || scholastic.watsup1_isd,
          watsup1_no: watsup1_no ? BigInt(watsup1_no) : scholastic.watsup1_no,
          watsup2_isd: watsup2_isd || scholastic.watsup2_isd,
          watsup2_no: watsup2_no ? BigInt(watsup2_no) : scholastic.watsup2_no,
          watsup3_isd: watsup3_isd || scholastic.watsup3_isd,
          watsup3_no: watsup3_no ? BigInt(watsup3_no) : scholastic.watsup3_no,
          emergency_isd: emergency_isd || scholastic.emergency_isd,
          emergency_contact_no: emergency_contact_no ? BigInt(emergency_contact_no) : scholastic.emergency_contact_no,
          personal_mailid1: truncatedPersonalMailid1,
          blood_group_code: blood_group_code || scholastic.blood_group_code,
          nationality_code: nationality_code || scholastic.nationality_code,
          language_code,
          concurrency_val,
          updated_by: updated_by || scholastic.updated_by,
          updated_date: finalUpdatedDate,
        },
      });

      // Convert BigInt fields to strings before sending response
      const responseData = JSON.parse(
        JSON.stringify(updatedScholastic, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        )
      );

      res.status(200).json(responseData);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });
};










