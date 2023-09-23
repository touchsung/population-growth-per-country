import { useCallback, useEffect, useState } from "react";
import Papa from "papaparse";
import { Bar } from "react-chartjs-2";
import { registerables, Chart } from "chart.js";
import "./App.css";
import { ClipLoader } from "react-spinners";

Chart.register(...registerables);

const INITIAL_REGIONS = [
  {
    name: "Africa",
    hidden: false,
    color: "#90ccc6",
  },
  {
    name: "Asia",
    hidden: false,
    color: "#9a9aff",
  },
  {
    name: "Europe",
    hidden: false,
    color: "#2f7fb3",
  },
  {
    name: "America",
    hidden: false,
    color: "#700038",
  },
  {
    name: "Oceania",
    hidden: false,
    color: "#700038",
  },
];

function App() {
  const [datasets, setDatasets] = useState([]);
  const [rawData, setRawData] = useState({});
  const [currentYear, setCurrentYear] = useState(1950);
  const [countryColors, setCountryColors] = useState({});
  const [totalPopulations, setTotalPopulation] = useState(0);
  const [regions, setRegions] = useState(INITIAL_REGIONS);
  const [loading, setLoading] = useState(true);
  const [previousPosition, setPreviosPosition] = useState(7);

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

    const filteredData = rawData[String(currentYear)]
      .filter((data) => {
        const isCountryHidden = hiddenCountry.some(
          (dataAPI) => dataAPI.name.common === data["Country name"]
        );
        return !isCountryHidden;
      })
      .sort((a, b) => b.Population - a.Population)
      .slice(0, 12);

    const totalPopulation = filteredData.reduce((accumulator, data) => {
      return accumulator + parseInt(data.Population, 10);
    }, 0);

    setDatasets(filteredData);
    setTotalPopulation(totalPopulation);
  };

  const memoizedUpdatedDataByYear = useCallback(updatedDataByYear, [
    currentYear,
    rawData,
    regions,
  ]);

  useEffect(() => {
    const fetchData = () => {
      Papa.parse(
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtLp_z3PbNcTZENA2Jc8xW-q0qW4u--Qf5o1gY3wYSUGZQ2QF3PU4TYjnrDsl0rnN1if5PiPNdOdzz/pub?gid=1593630108&single=true&output=csv",
        {
          download: true,
          header: true,
          skipEmptyLines: true,
          complete: ({ data: datas }) => {
            const transformedData = {};
            datas.forEach((data) => {
              const year = data.Year;

              if (!transformedData[year]) {
                transformedData[year] = [];
              }

              transformedData[year].push({
                "Country name": data["Country name"],
                Year: data.Year,
                Population: data.Population,
              });
            });

            setRawData(transformedData);
            setLoading(false);
          },
        }
      );
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!loading) {
      const incrementYear = () => {
        if (currentYear < 2021) {
          memoizedUpdatedDataByYear();
          setCurrentYear(currentYear + 1);
        }
      };

      const intervalId = setInterval(incrementYear, 1000);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [currentYear, loading, memoizedUpdatedDataByYear]);

  useEffect(() => {
    if (!loading) {
      const findPosition = () => {
        if (currentYear >= 2022) return;
        const triangleElement = document.getElementById("triangle");
        if (currentYear === 2021) {
          triangleElement.style.left = previousPosition + "px";
          triangleElement.style.left = previousPosition + "px";
        } else {
          const yearElement = document.getElementById(currentYear);
          const nextYearElement = document.getElementById(currentYear + 1);

          const horizontalDistance = Math.abs(
            yearElement.getBoundingClientRect().left -
              nextYearElement.getBoundingClientRect().left
          );
          triangleElement.style.left = previousPosition + "px";
          setPreviosPosition(previousPosition + horizontalDistance);
        }
      };

      findPosition();
    }
  }, [currentYear, loading]);

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
      },
    },
  };

  return loading ? (
    <main
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <ClipLoader size={40} color="#F47E20" />
    </main>
  ) : (
    <main className="App">
      <h2 className="title-text">Population growth per country 1950 to 2021</h2>
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
              style={{
                textDecoration: `${region.hidden ? "line-through" : "none"}`,
              }}
              onClick={() => {
                const updatedRegions = [...regions];
                updatedRegions[index].hidden = !updatedRegions[index].hidden;
                setRegions(updatedRegions);
                updatedDataByYear();
              }}
            >
              <div
                style={{
                  backgroundColor: region.color,
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
