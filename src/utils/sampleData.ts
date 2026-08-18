export interface SampleDataset {
  id: string;
  name: string;
  category: 'Polígono (Mapeamento)' | 'Multi-Bairros (Purge & Extração)' | 'Linha (Inspeção Linear)' | 'Pontos (Inspeção Estrutural)';
  description: string;
  kmlContent: string;
  recommendedMode: 'grid' | 'direct' | 'multi';
}

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: 'bairros-sede',
    name: 'Bairros Sede (MURIÇI, CENTRO, CANEQUINHO, LADEIRA)',
    category: 'Multi-Bairros (Purge & Extração)',
    description: 'Arquivo multi-polígonos com estilos do Google Earth. Ideal para testar a extração e limpeza automática por bairro.',
    recommendedMode: 'multi',
    kmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
  <Document id="root_doc">
    <name>bairros sede</name>
    <Schema name="bairros_sede" id="bairros_sede">
      <SimpleField name="ID" type="int"></SimpleField>
      <SimpleField name="NOME" type="string"></SimpleField>
      <SimpleField name="ZONA" type="string"></SimpleField>
    </Schema>
    <Style id="poly_style_murici">
      <LineStyle><color>ff00ffff</color><width>2</width></LineStyle>
      <PolyStyle><color>4000ffff</color><fill>1</fill><outline>1</outline></PolyStyle>
    </Style>
    <Style id="poly_style_centro">
      <LineStyle><color>ffff0000</color><width>2</width></LineStyle>
      <PolyStyle><color>40ff0000</color><fill>1</fill><outline>1</outline></PolyStyle>
    </Style>
    <Folder>
      <name>Bairros Urbanos</name>
      
      <!-- Bairro 1: MURIÇI -->
      <Placemark>
        <name>MURIÇI</name>
        <styleUrl>#poly_style_murici</styleUrl>
        <ExtendedData>
          <SchemaData schemaUrl="#bairros_sede">
            <SimpleData name="ID">101</SimpleData>
            <SimpleData name="NOME">MURIÇI</SimpleData>
            <SimpleData name="ZONA">Norte</SimpleData>
          </SchemaData>
        </ExtendedData>
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>
                -47.88250,-15.79400,0
                -47.87800,-15.79350,0
                -47.87700,-15.79800,0
                -47.88100,-15.79950,0
                -47.88350,-15.79650,0
                -47.88250,-15.79400,0
              </coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>

      <!-- Bairro 2: CENTRO -->
      <Placemark>
        <name>CENTRO</name>
        <styleUrl>#poly_style_centro</styleUrl>
        <ExtendedData>
          <SchemaData schemaUrl="#bairros_sede">
            <SimpleData name="ID">102</SimpleData>
            <SimpleData name="NOME">CENTRO</SimpleData>
            <SimpleData name="ZONA">Central</SimpleData>
          </SchemaData>
        </ExtendedData>
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>
                -47.87700,-15.79800,0
                -47.87200,-15.79750,0
                -47.87100,-15.80200,0
                -47.87550,-15.80350,0
                -47.87800,-15.80050,0
                -47.87700,-15.79800,0
              </coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>

      <!-- Bairro 3: CANEQUINHO -->
      <Placemark>
        <name>CANEQUINHO</name>
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>
                -47.88350,-15.79650,0
                -47.88100,-15.79950,0
                -47.88300,-15.80400,0
                -47.88750,-15.80300,0
                -47.88600,-15.79800,0
                -47.88350,-15.79650,0
              </coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>

      <!-- Bairro 4: LADEIRA -->
      <Placemark>
        <name>LADEIRA</name>
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>
                -47.88800,-15.80300,0
                -47.88300,-15.80400,0
                -47.88450,-15.80850,0
                -47.89000,-15.80750,0
                -47.88800,-15.80300,0
              </coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>
    </Folder>
  </Document>
</kml>`,
  },
  {
    id: 'farm-polygon',
    name: 'Fazenda Boa Esperança - Talhão 04 (Polígono Único)',
    category: 'Polígono (Mapeamento)',
    description: 'Área rural de 14.5 hectares para ortofotomosaico, topografia e agricultura de precisão.',
    recommendedMode: 'grid',
    kmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Fazenda Boa Esperanca - Talhao 04</name>
    <description>Poligono delimitado para voo de mapeamento com drone</description>
    <Placemark>
      <name>Perimetro Talhao 04</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              -47.88250,-15.79400,0
              -47.87800,-15.79350,0
              -47.87700,-15.79800,0
              -47.88100,-15.79950,0
              -47.88350,-15.79650,0
              -47.88250,-15.79400,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`,
  },
  {
    id: 'powerline-corridor',
    name: 'Linha de Transmissão LT-69kV (Linha Única)',
    category: 'Linha (Inspeção Linear)',
    description: 'Corredor linear de 2.8 km para inspeção de torres de energia e faixa de servidão.',
    recommendedMode: 'direct',
    kmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>LT 69kV Eixo de Inspecao</name>
    <Placemark>
      <name>Eixo da Linha de Transmissao</name>
      <LineString>
        <coordinates>
          -47.89500,-15.81000,1050
          -47.89200,-15.80500,1045
          -47.88800,-15.80100,1040
          -47.88300,-15.79800,1035
          -47.87800,-15.79500,1030
          -47.87200,-15.79300,1025
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`,
  },
  {
    id: 'tower-points',
    name: 'Torres de Telecomunicação (Pontos Únicos)',
    category: 'Pontos (Inspeção Estrutural)',
    description: 'Conjunto de 5 torres com coordenadas específicas para parada e fotos 360°/nadir.',
    recommendedMode: 'direct',
    kmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Torres Telecom - Inspecao</name>
    <Placemark>
      <name>Torre 01 - Centro</name>
      <description>Torre metalica 45m</description>
      <Point>
        <coordinates>-47.88600,-15.79200,65</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Torre 02 - Norte</name>
      <description>Torre autoportante 50m</description>
      <Point>
        <coordinates>-47.88450,-15.78900,70</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Torre 03 - Leste</name>
      <description>Torre estaiada 60m</description>
      <Point>
        <coordinates>-47.88100,-15.79150,75</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Torre 04 - Sul</name>
      <description>Torre metalica 40m</description>
      <Point>
        <coordinates>-47.88250,-15.79500,60</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Torre 05 - Oeste</name>
      <description>Torre repetidora 55m</description>
      <Point>
        <coordinates>-47.88800,-15.79400,65</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`,
  },
];
