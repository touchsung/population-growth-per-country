import { useCallback, useEffect, useState } from "react";
import Papa from "papaparse";
import { Bar } from "react-chartjs-2";
import { registerables, Chart } from "chart.js";
import "./App.css";

Chart.register(...registerables);

const INITIAL_REGIONS = [
  {
    name: "Africa",
    hidden: false,
  },
  {
    name: "Asia",
    hidden: false,
  },
  {
    name: "Europe",
    hidden: false,
  },
  {
    name: "America",
    hidden: false,
  },
  {
    name: "Oceania",
    hidden: false,
  },
];
function App() {
  const [datasets, setDatasets] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [top5Countries, setTop5Countries] = useState([]);
  const [currentYear, setCurrentYear] = useState(1950);
  const [countryColors, setCountryColors] = useState({});
  const [totalPopulations, setTotalPopulation] = useState(0);
  const [step, setStep] = useState(1);

  const [regions, setRegions] = useState(INITIAL_REGIONS);

  const getRandomColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const updatedDataByYear = async () => {
    const hiddenCountry = [];
    const hiddenRegions = regions.filter((region) => region.hidden);

    await Promise.all(
      hiddenRegions.map(async (region) => {
        const response = await fetch(
          "https://restcountries.com/v3/region/" + region.name
        );
        const datas = await response.json();
        hiddenCountry.push(...datas);
      })
    );

    const filteredData = rawData
      .filter((data) => {
        if (data.Year === String(currentYear)) {
          const isCountryHidden = hiddenCountry.some(
            (dataAPI) => dataAPI.name.common === data["Country name"]
          );
          return !isCountryHidden;
        }
        return false;
      })
      .sort((a, b) => b.Population - a.Population)
      .slice(0, 12);

    setDatasets(filteredData);
    const totalPopulation = filteredData.reduce((accumulator, data) => {
      return accumulator + parseInt(data.Population, 10);
    }, 0);

    setTotalPopulation(totalPopulation);
    setTop5Countries(
      filteredData.slice(0, 5).map((data) => data["Country name"])
    );
  };

  const memoizedUpdatedDataByYear = useCallback(updatedDataByYear, [
    currentYear,
    rawData,
    regions,
  ]);

  useEffect(() => {
    const fetchDataForYear = () => {
      Papa.parse("/storage/population-and-demography.csv", {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: ({ data: datas }) => {
          setRawData(datas);
        },
      });
    };

    fetchDataForYear();
  }, []);

  useEffect(() => {
    const incrementYear = () => {
      if (currentYear < 2021) {
        setCurrentYear(currentYear + 1);
        memoizedUpdatedDataByYear();
      }
    };

    const intervalId = setInterval(incrementYear, 300);

    return () => {
      clearInterval(intervalId);
    };
  }, [currentYear, memoizedUpdatedDataByYear, rawData]);

  useEffect(() => {
    const findPosition = () => {
      if (currentYear >= 2021) return;
      const yearElement = document.getElementById(currentYear);
      const nextYearElement = document.getElementById(currentYear + 1);
      const triangleElement = document.getElementById("triangle");

      const diffPosition =
        nextYearElement.getBoundingClientRect().left -
        yearElement.getBoundingClientRect().left;

      triangleElement.style.left = 7 + (diffPosition * step + 1) + "px";
      setStep(step + 1);
    };

    findPosition();
  }, [currentYear]);

  const data = {
    labels: datasets.map((data) => data["Country name"]),
    datasets: [
      {
        label: "Population",
        data: datasets.map((data) => data.Population),
        backgroundColor: datasets.map((data) => {
          if (countryColors[data["Country name"]]) {
            return countryColors[data["Country name"]];
          } else {
            const color = getRandomColor();
            setCountryColors((pre) => {
              return {
                ...pre,
                [data["Country name"]]: color,
              };
            });
            return color;
          }
        }),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    indexAxis: "y",
    responsive: true,
    scales: {
      x: {
        position: "top",
      },
      y: {
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        display: false,
        position: "top",
        align: "start",
        labels: {
          usePointStyle: true,
          useBorderRadius: false,
          borderRadius: 0,
          font: {
            size: 12,
          },
          generateLabels: (chart) => {
            const { datasets } = chart.data;
            const legendItems = [];
            top5Countries.forEach((country, index) => {
              legendItems.push({
                text: country,
                fillStyle: datasets[0].backgroundColor[index],
              });
            });
            return legendItems;
          },
        },
      },
    },
  };

  return (
    <main className="App">
      <h2 className="title-text">Population by Country 1950 to 2021</h2>
      <p className="subtile-text">
        Click on the legend below to filter by continet
      </p>
      <section className="chart">
        <div className="region-groups">
          <span>Region : </span>
          {regions.map((region, index) => (
            <p
              key={index}
              className="region-text"
              onClick={() => {
                updatedDataByYear();
                const updatedRegions = [...regions];
                updatedRegions[index].hidden = !updatedRegions[index].hidden;
                setRegions(updatedRegions);
              }}
            >
              <div
                style={{
                  backgroundColor: getRandomColor(),
                  width: "10px",
                  height: "10px",
                  borderRadius: "2px",
                }}
              />
              <span>{region.name}</span>
            </p>
          ))}
        </div>
        <Bar data={data} options={options} />
        <div className="chart-text">
          <h3 className="year-text">{currentYear}</h3>
          <p className="total-population-text">
            Total :{" "}
            {totalPopulations.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </p>
        </div>
      </section>

      <section className="timeline">
        <div id="triangle" className="triangle" />
        {Array.from({ length: (2021 - 1950) / 4 + 1 }, (_, index) => (
          <div key={index} className="timeline-year">
            {1950 + index * 4}
            <div className="timeline-minor-scale">
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} id={1950 + i + index * 4}>
                  |
                </span>
              ))}
            </div>
          </div>
        ))}
        <hr className="timeline-line" />
      </section>
    </main>
  );
}

export default App;
