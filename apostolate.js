import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const saveApostolate = async (req, res) => {
  const {
      apostolate_code,
      centre_type_code,
      language_code,
      concurrency_val,
      created_by,
      created_date,
      updated_by,
      updated_date
  } = req.body;

  try {
      console.log('Received data:', req.body);

      // Fetch apostolate_name from quickcode_mst where quick_code_type is 'apostl' and quick_code matches apostolate_code
      const apostolate = await prisma.quickcode_mst.findUnique({
          where: {
              quick_code_type_quick_code: {
                  quick_code_type: 'apostl',
                  quick_code: apostolate_code
              }
          }
      });

      console.log('Apostolate lookup result:', apostolate);

      if (!apostolate) {
          console.error(`Apostolate code ${apostolate_code} not found`);
          return res.status(404).json({ error: `Apostolate code ${apostolate_code} not found` });
      }

      // Fetch centre_type_name from quickcode_mst where quick_code_type is 'ctrtyp' and quick_code matches centre_type_code
      const centreType = await prisma.quickcode_mst.findUnique({
          where: {
              quick_code_type_quick_code: {
                  quick_code_type: 'ctrtyp',
                  quick_code: centre_type_code
              }
          }
      });

      console.log('Centre type lookup result:', centreType);

      if (!centreType) {
          console.error(`Centre type code ${centre_type_code} not found`);
          return res.status(404).json({ error: `Centre type code ${centre_type_code} not found` });
      }

      // Save to apostolates_mst
      const result = await prisma.apostolates_mst.create({
          data: {
              apostolate_code,
              centre_type_code,
              apostolate_name: apostolate.quickcode_name,
              centre_type_name: centreType.quickcode_name.substring(0, 5), // Truncate to fit the column length
              language_code,
              concurrency_val,
              created_by,
              created_date: created_date ? new Date(created_date) : new Date(),
              updated_by,
              updated_date: updated_date ? new Date(updated_date) : new Date()
          }
      });

      console.log('Data saved successfully:', result);
      return res.status(201).json({ message: 'Data saved successfully', data: result });
  } catch (error) {
      console.error('Error saving data:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateCentreTypeForApostolate = async (req, res) => {
  const { apostolate_code, new_centre_type_code } = req.body;

  try {
      // Fetch the new centre type name
      const centreType = await prisma.quickcode_mst.findUnique({
          where: {
              quick_code_type_quick_code: {
                  quick_code_type: 'ctrtyp',
                  quick_code: new_centre_type_code
              }
          }
      });

      if (!centreType) {
          console.error(`Centre type code ${new_centre_type_code} not found`);
          return res.status(404).json({ error: `Centre type code ${new_centre_type_code} not found` });
      }

      // Define the maximum length for the centre_type_name column
      const maxLength = 50; // Adjust this value to match your schema
      const truncatedCentreTypeName = centreType.quickcode_name.substring(0, maxLength); // Truncate to fit the column length

      console.log('Updating apostolate_code:', apostolate_code);
      console.log('New centre_type_code:', new_centre_type_code);
      console.log('Truncated centre_type_name:', truncatedCentreTypeName);

      // Check if the combination of apostolate_code and new_centre_type_code already exists
      const existingEntry = await prisma.apostolates_mst.findUnique({
          where: {
              apostolate_code_centre_type_code: {
                  apostolate_code: apostolate_code,
                  centre_type_code: new_centre_type_code
              }
          }
      });

      if (existingEntry) {
          console.error(`Apostolate code ${apostolate_code} and centre type code ${new_centre_type_code} combination already exists`);
          return res.status(409).json({ error: `Apostolate code ${apostolate_code} and centre type code ${new_centre_type_code} combination already exists` });
      }

      // Update the centre type for the given apostolate code
      const result = await prisma.apostolates_mst.updateMany({
          where: {
              apostolate_code: apostolate_code
          },
          data: {
              centre_type_code: new_centre_type_code,
              centre_type_name: truncatedCentreTypeName // Use truncated centre type name
          }
      });

      if (result.count === 0) {
          console.error(`Apostolate code ${apostolate_code} not found`);
          return res.status(404).json({ error: `Apostolate code ${apostolate_code} not found` });
      }

      console.log('Centre type updated successfully:', result);
      return res.status(200).json({ message: 'Centre type updated successfully', data: result });
  } catch (error) {
      console.error('Error updating centre type:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
  }
};





export const getApostolates = async (req, res) => {
  try {
    // Step 1: Fetch Data from `apostolates_mst`
    const apostolates = await prisma.apostolates_mst.findMany();

    // Step 2: Fetch Data from `quickcode_mst` for Apostolates
    const apostolateCodes = apostolates.map(a => a.apostolate_code);
    const apostolateNames = await prisma.quickcode_mst.findMany({
      where: {
        quick_code_type: 'apostl',
        quick_code: { in: apostolateCodes }
      },
      select: {
        quick_code: true,
        quickcode_name: true
      }
    });

    // Step 3: Fetch Data from `quickcode_mst` for Centre Types
    const centreTypeCodes = apostolates.map(a => a.centre_type_code);
    const centreTypeNames = await prisma.quickcode_mst.findMany({
      where: {
        quick_code_type: 'ctrtyp',
        quick_code: { in: centreTypeCodes }
      },
      select: {
        quick_code: true,
        quickcode_name: true
      }
    });

    // Step 4: Combine the Results
    const formattedApostolates = apostolates.map(apostolate => {
      const apostolateName = apostolateNames.find(a => a.quick_code === apostolate.apostolate_code);
      const centreTypeName = centreTypeNames.find(c => c.quick_code === apostolate.centre_type_code);

      return {
        apostolate_code: apostolate.apostolate_code,
        apostolate_name: apostolateName ? apostolateName.quickcode_name : null,
        centre_type_code: apostolate.centre_type_code,
        centre_type_name: centreTypeName ? centreTypeName.quickcode_name : null,
        date_format: apostolate.date_format,
        academic_year: apostolate.academic_year,
        language_code: apostolate.language_code,
        concurrency_val: apostolate.concurrency_val,
        created_by: apostolate.created_by,
        created_date: apostolate.created_date,
        updated_by: apostolate.updated_by,
        updated_date: apostolate.updated_date
      };
    });

    res.status(200).json({ data: formattedApostolates });
  } catch (error) {
    console.error('Error fetching apostolates:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
export const deleteApostolate = async (req, res) => {
  const { apostolate_code, centre_type_code } = req.body;

  try {
    if (apostolate_code && centre_type_code) {
      // If both apostolate_code and centre_type_code are provided
      await prisma.apostolates_mst.deleteMany({
        where: {
          apostolate_code: apostolate_code,
          centre_type_code: centre_type_code,
        },
      });
    } else if (apostolate_code) {
      // If only apostolate_code is provided
      await prisma.apostolates_mst.deleteMany({
        where: {
          apostolate_code: apostolate_code,
        },
      });
    } else if (centre_type_code) {
      // If only centre_type_code is provided
      await prisma.apostolates_mst.deleteMany({
        where: {
          centre_type_code: centre_type_code,
        },
      });
    } else {
      return res.status(400).json({ error: 'Please provide either apostolate_code or centre_type_code or both.' });
    }

    return res.status(200).json({ message: 'Apostolate deleted successfully.' });
  } catch (error) {
    console.error('Error deleting apostolate:', error);
    return res.status(500).json({ error: 'Failed to delete apostolate' });
  }
};
export const getApostolateNames = async (req, res) => {
  try {
    const apostolates = await prisma.quickcode_mst.findMany({
      where: {
        quick_code_type: 'apostl'
      },
      select: {
        quick_code: true,
        quickcode_name: true
      }
    });

    return res.status(200).json(apostolates);
  } catch (error) {
    console.error('Error fetching apostolate names:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getCentreTypeNames = async (req, res) => {
  try {
    const centreTypes = await prisma.quickcode_mst.findMany({
      where: {
        quick_code_type: 'ctrtyp'
      },
      select: {
        quick_code: true,
        quickcode_name: true
      }
    });

    return res.status(200).json(centreTypes);
  } catch (error) {
    console.error('Error fetching centre type names:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};