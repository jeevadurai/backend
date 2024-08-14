import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Utility function to convert BigInt values to strings
function jsonifyBigInt(obj) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

// Utility function to generate the next curia_code
async function generateCuriaCode() {
  const lastRecord = await prisma.curia_advisors_dtl.findFirst({
    orderBy: {
      curia_code: 'desc',
    },
    select: {
      curia_code: true,
    },
  });

  if (lastRecord && lastRecord.curia_code) {
    const lastCodeNumber = parseInt(lastRecord.curia_code.slice(3), 10);
    const nextCodeNumber = lastCodeNumber + 1;
    return `CUR${String(nextCodeNumber).padStart(3, '0')}`;
  } else {
    return 'CUR001';
  }
}

export async function saveCuriaAdvisorDetails(req, res) {
  try {
    const data = req.body;

    // Debug: Log input data
    console.log('Input Data:', data);

    // Check if confrer_code and province_code are provided
    if (!data.confrer_code || !data.province_code) {
      return res.status(400).json({ error: 'confrer_code and province_code are required.' });
    }

    // Validate confrer_code from confreres_dtl table
    const confrere = await prisma.confreres_dtl.findFirst({
      where: {
        confrer_code: data.confrer_code,
      },
    });
    if (!confrere) {
      return res.status(404).json({ error: `Confrer code ${data.confrer_code} not found.` });
    }

    // Validate province_code from province_mst table using findFirst
    const province = await prisma.province_mst.findFirst({
      where: {
        province_code: data.province_code,
      },
    });
    if (!province) {
      return res.status(404).json({ error: `Province code ${data.province_code} not found.` });
    }

    // Validate division_code from division_setup_mst table using findFirst
    const division = await prisma.division_setup_mst.findFirst({
      where: {
        division_code: data.division_code,
      },
    });
    if (!division) {
      return res.status(404).json({ error: `Division code ${data.division_code} not found.` });
    }

    // Validate division_type_code from quickcode_mst table
    const divisionType = await prisma.quickcode_mst.findUnique({
      where: {
        quick_code_type_quick_code: {
          quick_code_type: 'divtyp',
          quick_code: data.division_type_code,
        },
      },
    });
    if (!divisionType) {
      return res.status(400).json({ error: `Invalid division_type_code: ${data.division_type_code}. It must be a valid quick_code in quickcode_mst with quick_code_type 'divtyp'.` });
    }

    // Validate pcic_off_code from quickcode_mst table
    const pcicOffCode = await prisma.quickcode_mst.findUnique({
      where: {
        quick_code_type_quick_code: {
          quick_code_type: 'pcicof',
          quick_code: data.pcic_off_code,
        },
      },
    });
    if (!pcicOffCode) {
      return res.status(400).json({ error: `Invalid pcic_off_code: ${data.pcic_off_code}. It must be a valid quick_code in quickcode_mst with quick_code_type 'pcicof'.` });
    }

    // Validate mandate_code from quickcode_mst table
    const mandateCode = await prisma.quickcode_mst.findUnique({
      where: {
        quick_code_type_quick_code: {
          quick_code_type: 'mandat',
          quick_code: data.mandate_code,
        },
      },
    });
    if (!mandateCode) {
      return res.status(400).json({ error: `Invalid mandate_code: ${data.mandate_code}. It must be a valid quick_code in quickcode_mst with quick_code_type 'mandat'.` });
    }

    // Validate designation_code from quickcode_mst table
    const designationCode = await prisma.quickcode_mst.findUnique({
      where: {
        quick_code_type_quick_code: {
          quick_code_type: 'destyp',
          quick_code: data.designation_code,
        },
      },
    });
    if (!designationCode) {
      return res.status(400).json({ error: `Invalid designation_code: ${data.designation_code}. It must be a valid quick_code in quickcode_mst with quick_code_type 'destyp'.` });
    }

    // Generate the curia_code
    const curia_code = await generateCuriaCode();

    // Prepare the data for saving
    const saveData = {
      confrer_code: data.confrer_code,
      province_code: data.province_code,
      division_type_code: data.division_type_code, // Already validated
      division_code: data.division_code,
      designation_code: data.designation_code, // Already validated
      pcic_off_code: data.pcic_off_code, // Already validated
      curia_code, // Auto-generated curia_code
      appointment_date: new Date(data.appointment_date),
      mandate_code: data.mandate_code, // Already validated
      installation_date: new Date(data.installation_date),
      mandate_end_date: new Date(data.mandate_end_date),
      office1_isd: data.office1_isd,
      office1_contact_no: BigInt(data.office1_contact_no),
      office2_isd: data.office2_isd,
      office2_contact_no: BigInt(data.office2_contact_no),
      office3_isd: data.office3_isd,
      office3_contact_no: BigInt(data.office3_contact_no),
      office_mailid1: data.office_mailid1,
      office_mailid2: data.office_mailid2,
      office_mailid3: data.office_mailid3,
      language_code: 'en',
      concurrency_val: 1,
      created_by: 'admin',
      created_date: new Date(),
      updated_by: null,
      updated_date: null,
    };

    // Save the record
    const savedRecord = await prisma.curia_advisors_dtl.create({
      data: saveData,
    });

    // Convert BigInt values to strings before sending the response
    const jsonResponse = jsonifyBigInt(savedRecord);

    return res.status(201).json(jsonResponse);
  } catch (error) {
    console.error('Error saving curia advisor details:', error);
    return res.status(500).json({ error: 'An error occurred while saving curia advisor details.' });
  } finally {
    await prisma.$disconnect();
  }
}



export async function getCuriaAdvisorDetails(req, res) {
  try {
    // Fetch all records from curia_advisors_dtl
    const curiaAdvisors = await prisma.curia_advisors_dtl.findMany();

    // Convert BigInt values to strings before sending the response
    const jsonResponse = curiaAdvisors.map(record => jsonifyBigInt(record));

    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('Error fetching curia advisor details:', error);
    return res.status(500).json({ error: 'An error occurred while fetching curia advisor details.' });
  } finally {
    await prisma.$disconnect();
  }
}

export async function getCuriaAdvisorByCode(req, res) {
  try {
    const { curia_code } = req.params;

    // Fetch the record with the given curia_code
    const curiaAdvisor = await prisma.curia_advisors_dtl.findUnique({
      where: {
        curia_code: curia_code,  // Assuming curia_code is unique
      },
    });

    // If the record is not found, return a 404 error
    if (!curiaAdvisor) {
      return res.status(404).json({ error: `Curia advisor with curia_code ${curia_code} not found.` });
    }

    // Convert BigInt values to strings before sending the response
    const jsonResponse = jsonifyBigInt(curiaAdvisor);

    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('Error fetching curia advisor details by curia_code:', error);
    return res.status(500).json({ error: 'An error occurred while fetching curia advisor details.' });
  } finally {
    await prisma.$disconnect();
  }
}
