# Testing Configuration and Quality Gates

This document describes the comprehensive testing setup, configuration, and quality gates implemented for the backend project.

## Overview

The testing infrastructure includes:
- **pytest** configuration with coverage reporting
- **Multiple test runners** for different scenarios
- **Quality gates** for code quality enforcement
- **Performance testing** and benchmarking
- **Coverage reporting** with multiple formats
- **CI/CD integration** ready setup

## Configuration Files

### pytest.ini
Main pytest configuration file containing:
- Test discovery settings
- Coverage configuration
- Marker definitions
- Quality gates
- Environment-specific settings

### .coveragerc
Additional coverage configuration for detailed reporting.

### quality_gates.yml
Quality standards and gate definitions.

### codecov.yml
Codecov integration configuration.

## Test Runner Scripts

### Main Test Runner
```bash
# Run all tests with coverage
python run_tests.py --coverage

# Run unit tests only
python run_tests.py --unit --parallel

# Run integration tests
python run_tests.py --integration

# Run performance tests
python run_tests.py --performance

# Run with quality gates
python run_tests.py --quality-gates

# Run in CI mode
python run_tests.py --ci
```

### Specialized Runners

#### Unit Tests
```bash
# Fast unit tests
python run_unit_tests.py --fast

# Unit tests with coverage
python run_unit_tests.py --coverage

# Parallel unit tests
python run_unit_tests.py --parallel --verbose
```

#### Integration Tests
```bash
# Database and API integration tests
python run_integration_tests.py

# Integration tests with coverage
python run_integration_tests.py --coverage

# Integration tests in parallel
python run_integration_tests.py --parallel
```

#### Coverage Reporting
```bash
# Generate all coverage reports
python run_coverage.py

# Generate HTML report only
python run_coverage.py --format html

# Generate with custom fail threshold
python run_coverage.py --fail-under 85
```

#### Performance Tests
```bash
# Run benchmark tests
python run_performance_tests.py --benchmark

# Run with profiling
python run_performance_tests.py --profile

# Run with memory monitoring
python run_performance_tests.py --memory

# Save results
python run_performance_tests.py --save-results
```

#### CI/CD Tests
```bash
# Run tests for CI pipeline
python run_ci_tests.py

# Generate JUnit XML
python run_ci_tests.py --junit-xml

# Custom coverage threshold
python run_ci_tests.py --fail-under 90
```

## Test Markers

Use pytest markers to run specific test categories:

```bash
# Unit tests only
pytest -m unit

# Integration tests only
pytest -m integration

# Database tests only
pytest -m database

# API tests only
pytest -m api

# Performance tests only
pytest -m performance

# Slow tests only
pytest -m slow

# Skip slow tests
pytest -m "not slow"

# Custom marker combination
pytest -m "unit and not slow"
```

## Coverage Reporting

### Coverage Reports Generated

1. **Console Output**: Shows missing lines during test execution
2. **HTML Report**: Interactive web report in `htmlcov/index.html`
3. **XML Report**: For CI integration (`coverage.xml`)
4. **JSON Report**: Machine-readable format (`coverage.json`)

### Coverage Thresholds

- **Overall Coverage**: 80% minimum (configurable)
- **Branch Coverage**: Enabled for detailed analysis
- **Line Coverage**: Main metric for quality gates

### Coverage Exclusions

The following are excluded from coverage:
- Test files and fixtures
- Migration scripts
- `__init__.py` files
- Cache directories
- Build and distribution files

## Quality Gates

### Quality Gate Levels

1. **Development**: 70% coverage, 5 failures allowed
2. **Staging**: 80% coverage, 1 failure allowed
3. **Production**: 90% coverage, 0 failures allowed

### Quality Checks

Pre-configured quality checks include:
- Test coverage validation
- Code style (black, isort)
- Security scanning (safety)
- Dependency updates check

### Running Quality Gates

```bash
# Run all quality checks
python run_tests.py --quality-gates

# Run with specific coverage threshold
python run_coverage.py --fail-under 90

# Run code style checks
black --check backend/src/
isort --check-only backend/src/
```

## Environment Variables

### Test Configuration

```bash
# Database configuration
export TEST_DATABASE_URL="postgresql://user:pass@localhost/test_db"
export DATABASE_URL="sqlite:///./test.db"  # For fast unit tests

# Test environment
export TESTING="true"
export CI="true"  # For CI mode

# Coverage settings
export COVERAGE_FILE=".coverage"
export COV_FAIL_UNDER="80"

# Quality gates
export QUALITY_GATES_ENABLED="true"
export MIN_COVERAGE="85"
```

### CI/CD Environment

For CI/CD integration, set these variables:

```bash
export CI="true"
export GITHUB_ACTIONS="true"  # or other CI platform
export CODECOV_TOKEN="your-token"
export SLACK_WEBHOOK_URL="your-webhook"
```

## Performance Testing

### Benchmark Tests

Create benchmark tests using pytest-benchmark:

```python
import pytest

@pytest.mark.benchmark
def test_api_performance(benchmark):
    def api_call():
        # Your API call here
        response = client.get("/api/students")
        return response

    result = benchmark(api_call)
    assert result.status_code == 200
```

### Memory Profiling

```python
@pytest.mark.performance
def test_memory_usage(memory_monitor):
    # Test code here
    data = [i for i in range(10000)]

    # Memory usage will be reported automatically
    assert len(data) == 10000
```

### Performance Monitoring

Performance tests automatically track:
- Test execution time
- Memory usage
- Database query performance
- API response times

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.9'
    - name: Install dependencies
      run: |
        pip install -r backend/requirements.txt
    - name: Run tests
      run: |
        cd backend
        python run_ci_tests.py --junit-xml --coverage-xml
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v1
      with:
        file: backend/coverage.xml
        flags: unittests
        name: codecov-umbrella
```

### Quality Gate Integration

```yaml
- name: Quality Gates
  run: |
    cd backend
    python run_tests.py --quality-gates
```

## Debugging Tests

### Verbose Output

```bash
# Verbose test output
python run_tests.py --verbose

# Debug mode
python run_tests.py --debug

# Show all warnings
python run_tests.py -W error::DeprecationWarning
```

### Test Selection

```bash
# Run specific test file
python run_tests.py backend/test_main.py

# Run specific test function
python run_tests.py -k test_create_student

# Run tests matching pattern
python run_tests.py -k "student and not slow"

# Run failed tests only
python run_tests.py --lf
```

## Troubleshooting

### Common Issues

1. **AsyncIO Warnings**
   - Install pytest-asyncio: `pip install pytest-asyncio`
   - Use `@pytest.mark.asyncio` decorator on async tests

2. **Database Connection Issues**
   - Check `TEST_DATABASE_URL` environment variable
   - Ensure test database exists and is accessible
   - Use SQLite for fast unit tests

3. **Coverage Issues**
   - Check coverage exclusions in `.coveragerc`
   - Ensure source paths are correct
   - Clear old coverage data: `coverage erase`

4. **Import Errors**
   - Check Python path and virtual environment
   - Install missing dependencies
   - Check for circular imports

### Debug Commands

```bash
# Check test discovery
python -m pytest --collect-only

# Check test markers
python -m pytest --markers

# Run single test with debug
python -m pytest -v -s test_main.py::TestStudentCRUD::test_create_student

# Profile test performance
python -m pytest --profile
```

## Best Practices

### Writing Tests

1. **Use descriptive test names**
2. **Follow AAA pattern** (Arrange, Act, Assert)
3. **Use fixtures for common setup**
4. **Mark tests appropriately**
5. **Keep tests isolated and fast**

### Test Organization

1. **Unit tests** in `test_*.py` files
2. **Integration tests** in separate files
3. **Use markers** to categorize tests
4. **Group related tests** in classes
5. **Use descriptive docstrings**

### Coverage Goals

1. **Aim for 80%+ overall coverage**
2. **Focus on critical paths first**
3. **Use branch coverage for complex logic**
4. **Exclude generated code and tests**
5. **Regularly review coverage reports**

## Contributing

When adding new tests:

1. Add appropriate markers
2. Update this documentation if needed
3. Ensure tests pass in CI
4. Maintain coverage standards
5. Follow existing patterns

## Support

For issues with the testing setup:

1. Check the troubleshooting section
2. Review CI/CD logs
3. Verify environment configuration
4. Check dependency versions
5. Consult pytest and coverage documentation